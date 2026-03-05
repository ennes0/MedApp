/**
 * Badge Functions — Automatic badge assignment based on user activity.
 *
 * Badges are computed and assigned via scheduled checks and event triggers.
 */

import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ──────────────────────────────────────────────
// Badge types & criteria
// ──────────────────────────────────────────────

type BadgeType =
  | 'newcomer'
  | 'experienced'
  | 'veteran'
  | 'supporter'
  | 'reliable'
  | 'helpful'
  | 'early_adopter'
  | 'pro_member';

interface BadgeCheck {
  type: BadgeType;
  check: (uid: string, userData: any) => Promise<boolean>;
}

const BADGE_CHECKS: BadgeCheck[] = [
  {
    type: 'newcomer',
    check: async (_uid, userData) => {
      // Everyone starts as newcomer
      const createdAt = userData.createdAt?.toDate?.() ?? new Date();
      const diffDays = daysSince(createdAt);
      return diffDays < 90; // Newcomer for first 3 months
    },
  },
  {
    type: 'experienced',
    check: async (_uid, userData) => {
      const createdAt = userData.createdAt?.toDate?.() ?? new Date();
      return daysSince(createdAt) >= 90; // 3+ months
    },
  },
  {
    type: 'veteran',
    check: async (_uid, userData) => {
      const createdAt = userData.createdAt?.toDate?.() ?? new Date();
      return daysSince(createdAt) >= 365; // 1+ year
    },
  },
  {
    type: 'supporter',
    check: async (uid) => {
      // Has 10+ matched mates
      const matches = await db
        .collection('medMatches')
        .where('uids', 'array-contains', uid)
        .where('status', '==', 'matched')
        .get();
      return matches.size >= 10;
    },
  },
  {
    type: 'reliable',
    check: async (uid, userData) => {
      // No reports against them & active for 30+ days
      const createdAt = userData.createdAt?.toDate?.() ?? new Date();
      if (daysSince(createdAt) < 30) return false;

      const reports = await db
        .collection('reports')
        .where('reportedUid', '==', uid)
        .where('status', '==', 'action_taken')
        .limit(1)
        .get();
      return reports.empty;
    },
  },
  {
    type: 'pro_member',
    check: async (_uid, userData) => {
      return userData.pro?.active === true;
    },
  },
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// ──────────────────────────────────────────────
// Compute badges for a single user
// ──────────────────────────────────────────────

async function computeBadgesForUser(uid: string): Promise<void> {
  const userDoc = await db.doc(`users/${uid}`).get();
  if (!userDoc.exists) return;

  const userData = userDoc.data()!;
  const existingBadges: Array<{ type: string; earnedAt: any }> =
    userData.badges ?? [];
  const existingTypes = new Set(existingBadges.map((b) => b.type));

  const newBadges = [...existingBadges];
  let changed = false;

  for (const badgeCheck of BADGE_CHECKS) {
    if (existingTypes.has(badgeCheck.type)) continue;

    try {
      const earned = await badgeCheck.check(uid, userData);
      if (earned) {
        newBadges.push({
          type: badgeCheck.type,
          earnedAt: admin.firestore.Timestamp.now(),
        });
        changed = true;
        console.log(`[Badges] ${uid} earned badge: ${badgeCheck.type}`);
      }
    } catch (err) {
      console.warn(`[Badges] Error checking ${badgeCheck.type} for ${uid}:`, err);
    }
  }

  // Remove newcomer if they now have experienced or veteran
  if (
    newBadges.some((b) => b.type === 'experienced' || b.type === 'veteran') &&
    newBadges.some((b) => b.type === 'newcomer')
  ) {
    const filtered = newBadges.filter((b) => b.type !== 'newcomer');
    if (filtered.length !== newBadges.length) {
      changed = true;
      newBadges.length = 0;
      newBadges.push(...filtered);
    }
  }

  // Update mate count
  const matchesSnap = await db
    .collection('medMatches')
    .where('uids', 'array-contains', uid)
    .where('status', '==', 'matched')
    .get();
  const mateCount = matchesSnap.size;

  if (changed || userData.mateCount !== mateCount) {
    await db.doc(`users/${uid}`).update({
      badges: newBadges,
      mateCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

// ──────────────────────────────────────────────
// Trigger: When a med match is created/updated
// ──────────────────────────────────────────────

export const onMedMatchChanged = onDocumentWritten(
  'medMatches/{matchId}',
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) return;

    const uids: string[] = after.uids ?? [];
    for (const uid of uids) {
      await computeBadgesForUser(uid);
    }
  },
);

// ──────────────────────────────────────────────
// Scheduled: Daily badge refresh for all active users
// ──────────────────────────────────────────────

export const dailyBadgeRefresh = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'Europe/Istanbul',
  },
  async () => {
    console.log('[Badges] Starting daily badge refresh...');

    const usersSnap = await db
      .collection('users')
      .where('socialOptIn', '==', true)
      .get();

    let processed = 0;
    for (const userDoc of usersSnap.docs) {
      try {
        await computeBadgesForUser(userDoc.id);
        processed++;
      } catch (err) {
        console.warn(`[Badges] Error for ${userDoc.id}:`, err);
      }
    }

    console.log(`[Badges] Daily refresh complete. Processed ${processed} users.`);
  },
);
