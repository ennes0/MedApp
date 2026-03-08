/**
 * onMessageCreated — Server-side content moderation + push notifications for chat messages.
 *
 * Triggered when a new message is created in medMatches/{matchId}/messages.
 * 1. Performs deeper content analysis than client-side filtering and takes
 *    automated moderation actions when necessary.
 * 2. Sends a push notification to the recipient via Expo Push API.
 */

import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ──────────────────────────────────────────────
// Dangerous content patterns (server-side)
// ──────────────────────────────────────────────

const BLOCK_PATTERNS: RegExp[] = [
  // Harmful content
  /intihar|suicide|kendine\s*zarar|self[\s-]?harm/i,
  /öl(mek|üm|dür)|kill\s*(your)?self/i,

  // Selling/buying medications
  /\b(sat(ıyor|ılık|ın\s*al)|buy|sell|purchase|order)\b.*\b(ilaç|hap|med|pill|drug)\b/i,

  // Phone numbers
  /\+?\d{10,}/,
];

const WARN_PATTERNS: RegExp[] = [
  // Dosage advice
  /(\d+)\s*(mg|ml|gr|gram|tablet|hap|damla|drop)/i,
  /doz(unu|u|aj)?\s*(artır|azalt|değiştir|iki\s*kat)/i,
  /dose?\s*(increas|decreas|doubl|chang)/i,

  // Stop/start medication advice
  /ilacını?\s*(bırak|kes|alma|kullanma)/i,
  /(stop|quit|don'?t)\s*(tak|us)ing/i,

  // Mix medications
  /karıştır|birlikte\s*(iç|kullan|al)/i,
  /mix(ing)?\s*(with|meds|pills|drug)/i,

  // URLs
  /(http|https):\/\/[^\s]+/i,
];

const WARN_THRESHOLD = 5; // Auto-suspend after 5 content warnings
const WARNING_PERIOD_HOURS = 24; // Within 24 hours

export const onMessageCreated = onDocumentCreated(
  'medMatches/{matchId}/messages/{messageId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const message = snap.data() as {
      senderUid: string;
      text: string;
      pairId: string;
    };

    const { matchId } = event.params;
    const text = message.text ?? '';

    // Check for blocked content
    for (const pattern of BLOCK_PATTERNS) {
      if (pattern.test(text)) {
        // Block the message (mark as moderated)
        await snap.ref.update({
          moderated: true,
          moderationAction: 'block_message',
          moderationReason: 'Otomatik tespit: Engellenen içerik',
          originalText: text,
          text: '[Bu mesaj topluluk kurallarına aykırı bulunarak kaldırıldı]',
        });

        // Log moderation action
        await db.collection('moderationLogs').add({
          targetUid: message.senderUid,
          action: 'block_message',
          reason: `Engellenen içerik tespit edildi: ${pattern.toString()}`,
          triggeredBy: 'auto',
          messageId: event.params.messageId,
          chatId: matchId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Check recent warnings for auto-suspend
        await checkWarningThreshold(message.senderUid);
        return;
      }
    }

    // Check for warned content
    for (const pattern of WARN_PATTERNS) {
      if (pattern.test(text)) {
        // Add a warning flag but don't block
        await snap.ref.update({
          contentWarning: true,
          contentWarningType: 'medical_advice',
        });

        // Log moderation action
        await db.collection('moderationLogs').add({
          targetUid: message.senderUid,
          action: 'warn',
          reason: `Warning content detected: ${pattern.toString()}`,
          triggeredBy: 'auto',
          messageId: event.params.messageId,
          chatId: matchId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Still send push notification for warned content (it's not blocked)
        await sendChatPushNotification(matchId, message.senderUid, text);
        return;
      }
    }

    // ── No moderation issues — send push notification to recipient ──
    await sendChatPushNotification(matchId, message.senderUid, text);
  },
);

// ──────────────────────────────────────────────
// Push notification helper
// ──────────────────────────────────────────────

/**
 * Send a push notification to the chat recipient via Expo Push API.
 */
async function sendChatPushNotification(
  matchId: string,
  senderUid: string,
  text: string,
): Promise<void> {
  try {
    // 1. Get the match document to find both UIDs
    const matchDoc = await db.doc(`medMatches/${matchId}`).get();
    if (!matchDoc.exists) return;

    const matchData = matchDoc.data()!;
    const uids: string[] = matchData.uids ?? [];

    // 2. Determine recipient (not the sender)
    const recipientUid = uids.find((uid: string) => uid !== senderUid);
    if (!recipientUid) return;

    // 3. Get recipient's user doc for push token + sender's name
    const [recipientDoc, senderDoc] = await Promise.all([
      db.doc(`users/${recipientUid}`).get(),
      db.doc(`users/${senderUid}`).get(),
    ]);

    if (!recipientDoc.exists) return;

    const recipientData = recipientDoc.data()!;
    const pushToken = recipientData.expoPushToken as string | null;
    if (!pushToken) return;

    // Check recipient isn't suspended or has blocked the sender
    if (recipientData.suspended) return;
    const blockList: string[] = recipientData.blockList ?? [];
    if (blockList.includes(senderUid)) return;

    const senderName =
      senderDoc.exists ? (senderDoc.data()!.nickname as string) || (senderDoc.data()!.displayName as string) ?? 'Your mate' : 'Your mate';
    const medName = (matchData.medDisplayName as string) ?? 'medication';

    // 4. Truncate message for notification body
    const body = text.length > 100 ? text.slice(0, 97) + '...' : text;

    // 5. Send via Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title: senderName,
        body,
        sound: 'default',
        badge: 1,
        data: {
          type: 'chat_message',
          matchId,
          senderUid,
        },
      }),
    });

    if (!response.ok) {
      console.error('[Push] Expo API error:', response.status, await response.text());
    }
  } catch (err) {
    console.error('[Push] sendChatPushNotification failed:', err);
  }
}

/**
 * Check if a user has exceeded the warning threshold and should be suspended.
 */
async function checkWarningThreshold(uid: string): Promise<void> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - WARNING_PERIOD_HOURS);

  const recentLogs = await db
    .collection('moderationLogs')
    .where('targetUid', '==', uid)
    .where('action', 'in', ['block_message', 'warn'])
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(cutoff))
    .get();

  if (recentLogs.size >= WARN_THRESHOLD) {
    // Auto-suspend user
    await db.doc(`users/${uid}`).update({
      socialVisible: false,
      suspended: true,
      suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('moderationLogs').add({
      targetUid: uid,
      action: 'suspend',
      reason: `${WARNING_PERIOD_HOURS} saat içinde ${recentLogs.size} içerik ihlali — otomatik askıya alındı`,
      triggeredBy: 'auto',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.warn(`[Moderation] User ${uid} auto-suspended: ${recentLogs.size} violations in ${WARNING_PERIOD_HOURS}h`);
  }
}
