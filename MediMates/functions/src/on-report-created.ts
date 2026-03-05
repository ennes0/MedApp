/**
 * onReportCreated — Enhanced auto-moderation trigger.
 *
 * When a report is filed:
 * 1. Log the report with detailed reason
 * 2. Check unique reporter count
 * 3. Auto-suspend after threshold
 * 4. Create moderation log entry
 */

import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const REPORT_THRESHOLD = 3; // Auto-suspend after this many unique reports
const MEDICAL_ADVICE_THRESHOLD = 2; // Lower threshold for medical advice reports

export const onReportCreated = onDocumentCreated(
  'reports/{reportId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const report = snap.data() as {
      reporterId: string;
      reportedUid: string;
      reason: string;
      reasonDetail?: string;
      chatId?: string;
      messageId?: string;
      messageText?: string;
    };

    console.log(
      `[Report] ${report.reporterId} reported ${report.reportedUid} — ${report.reason}: ${report.reasonDetail ?? 'no detail'}`,
    );

    // Count unique reports against this user
    const reportsQuery = await db
      .collection('reports')
      .where('reportedUid', '==', report.reportedUid)
      .get();

    const uniqueReporters = new Set(
      reportsQuery.docs.map((d) => d.data().reporterId),
    );

    // Count medical-advice-specific reports
    const medicalReports = reportsQuery.docs.filter(
      (d) => d.data().reason === 'medical_advice' || d.data().reason === 'dangerous_info',
    );
    const uniqueMedReporters = new Set(medicalReports.map((d) => d.data().reporterId));

    // Determine threshold based on report type
    const isMedicalReport = report.reason === 'medical_advice' || report.reason === 'dangerous_info';
    const threshold = isMedicalReport ? MEDICAL_ADVICE_THRESHOLD : REPORT_THRESHOLD;
    const currentCount = isMedicalReport ? uniqueMedReporters.size : uniqueReporters.size;

    // Create moderation log
    await db.collection('moderationLogs').add({
      targetUid: report.reportedUid,
      action: 'flag',
      reason: `Rapor: ${report.reason} — ${report.reasonDetail ?? 'detay yok'}`,
      triggeredBy: 'report',
      messageId: report.messageId ?? null,
      chatId: report.chatId ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (currentCount >= threshold) {
      // Auto-suspend: hide from discover, disable chat
      await db.doc(`users/${report.reportedUid}`).update({
        socialVisible: false,
        suspended: true,
        suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log suspension
      await db.collection('moderationLogs').add({
        targetUid: report.reportedUid,
        action: 'suspend',
        reason: `Otomatik askıya alma: ${currentCount} benzersiz rapor (eşik: ${threshold})`,
        triggeredBy: 'report',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.warn(
        `[Report] User ${report.reportedUid} auto-suspended (${currentCount} unique reporters, threshold: ${threshold})`,
      );
    }

    // If the report includes a specific message, flag it
    if (report.chatId && report.messageId) {
      try {
        await db
          .doc(`medMatches/${report.chatId}/messages/${report.messageId}`)
          .update({
            reported: true,
            reportCount: admin.firestore.FieldValue.increment(1),
          });
      } catch (err) {
        console.warn('[Report] Could not flag message:', err);
      }
    }

    // TODO: Send admin notification (e.g., via email, Slack, or Firebase Cloud Messaging)
  },
);
