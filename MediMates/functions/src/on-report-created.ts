/**
 * onReportCreated — Auto-moderation trigger.
 * When a report is filed, log it and optionally disable the reported user.
 */

import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const REPORT_THRESHOLD = 3; // Auto-suspend after this many unique reports

export const onReportCreated = onDocumentCreated(
  'reports/{reportId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const report = snap.data() as {
      reporterId: string;
      reportedUid: string;
      reason: string;
      chatId?: string;
    };

    console.log(
      `Report: ${report.reporterId} reported ${report.reportedUid} — ${report.reason}`,
    );

    // Count unique reports against this user
    const reportsQuery = await db
      .collection('reports')
      .where('reportedUid', '==', report.reportedUid)
      .get();

    const uniqueReporters = new Set(
      reportsQuery.docs.map((d) => d.data().reporterId),
    );

    if (uniqueReporters.size >= REPORT_THRESHOLD) {
      // Auto-suspend: hide from discover, disable chat
      await db.doc(`users/${report.reportedUid}`).update({
        socialVisible: false,
        suspended: true,
        suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.warn(
        `User ${report.reportedUid} auto-suspended (${uniqueReporters.size} reports)`,
      );
    }

    // TODO: Send admin notification (e.g., via email or Slack webhook)
  },
);
