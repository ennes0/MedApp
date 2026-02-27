"use strict";
/**
 * onReportCreated — Auto-moderation trigger.
 * When a report is filed, log it and optionally disable the reported user.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onReportCreated = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const REPORT_THRESHOLD = 3; // Auto-suspend after this many unique reports
exports.onReportCreated = (0, firestore_1.onDocumentCreated)('reports/{reportId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const report = snap.data();
    console.log(`Report: ${report.reporterId} reported ${report.reportedUid} — ${report.reason}`);
    // Count unique reports against this user
    const reportsQuery = await db
        .collection('reports')
        .where('reportedUid', '==', report.reportedUid)
        .get();
    const uniqueReporters = new Set(reportsQuery.docs.map((d) => d.data().reporterId));
    if (uniqueReporters.size >= REPORT_THRESHOLD) {
        // Auto-suspend: hide from discover, disable chat
        await db.doc(`users/${report.reportedUid}`).update({
            socialVisible: false,
            suspended: true,
            suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.warn(`User ${report.reportedUid} auto-suspended (${uniqueReporters.size} reports)`);
    }
    // TODO: Send admin notification (e.g., via email or Slack webhook)
});
//# sourceMappingURL=on-report-created.js.map