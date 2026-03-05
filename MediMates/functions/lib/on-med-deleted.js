"use strict";
/**
 * onMedDeleted — Firestore trigger.
 *
 * When a user deletes a medication, automatically expire any active
 * medMatch documents for that medication so the match is broken.
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
exports.onMedDeleted = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
function normalizeMedName(name) {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}
exports.onMedDeleted = (0, firestore_1.onDocumentDeleted)('userMeds/{userId}/items/{medId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const medData = snap.data();
    const userId = event.params.userId;
    const medName = medData.name;
    if (!medName)
        return;
    const medNameKey = normalizeMedName(medName);
    // Find all active matches for this user + medication
    const matchesSnap = await db
        .collection('medMatches')
        .where('uids', 'array-contains', userId)
        .where('medNameKey', '==', medNameKey)
        .where('status', '==', 'matched')
        .get();
    if (matchesSnap.empty) {
        console.log(`No active matches to expire for ${userId} + ${medNameKey}`);
        return;
    }
    const batch = db.batch();
    for (const matchDoc of matchesSnap.docs) {
        batch.update(matchDoc.ref, {
            status: 'expired',
            expiredAt: admin.firestore.FieldValue.serverTimestamp(),
            expiredReason: 'medication_deleted',
        });
    }
    await batch.commit();
    console.log(`Expired ${matchesSnap.size} match(es) for ${userId} after deleting "${medName}"`);
});
//# sourceMappingURL=on-med-deleted.js.map