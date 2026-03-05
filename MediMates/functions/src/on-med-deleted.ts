/**
 * onMedDeleted — Firestore trigger.
 *
 * When a user deletes a medication, automatically expire any active
 * medMatch documents for that medication so the match is broken.
 */

import * as admin from 'firebase-admin';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function normalizeMedName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

export const onMedDeleted = onDocumentDeleted(
  'userMeds/{userId}/items/{medId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const medData = snap.data();
    const userId = event.params.userId;
    const medName = medData.name as string;
    if (!medName) return;

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

    console.log(
      `Expired ${matchesSnap.size} match(es) for ${userId} after deleting "${medName}"`,
    );
  },
);
