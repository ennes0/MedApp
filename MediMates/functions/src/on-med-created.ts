/**
 * onMedCreated — Firestore trigger.
 *
 * When a user adds a new medication, automatically search for a mate
 * who takes the same medication and create a medMatch document.
 *
 * Rules:
 * - Each medication gets exactly 1 mate match
 * - Both users must have socialOptIn=true and socialVisible=true
 * - Matching is random among candidates
 * - Duplicate matches are prevented (unique per medNameKey + user pair)
 */

import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function normalizeMedName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

export const onMedCreated = onDocumentCreated(
  'userMeds/{userId}/items/{medId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const medData = snap.data();
    const userId = event.params.userId;
    const medName = medData.name as string;
    const medNameKey = normalizeMedName(medName);
    const medForm = (medData.form as string) ?? null;
    const medColor = (medData.color as string) ?? '#007AFF';

    // Check if the user has socialOptIn
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data()!;
    if (!userData.socialOptIn || !userData.socialVisible) {
      console.log(`User ${userId} has social disabled, skipping match.`);
      return;
    }

    // Check if match already exists for this med + user
    const existingMatch = await db
      .collection('medMatches')
      .where('uids', 'array-contains', userId)
      .where('medNameKey', '==', medNameKey)
      .where('status', '==', 'matched')
      .limit(1)
      .get();

    if (!existingMatch.empty) {
      console.log(`Match already exists for ${userId} + ${medNameKey}`);
      return;
    }

    // Find candidates: users with socialOptIn + socialVisible
    const candidatesSnap = await db
      .collection('users')
      .where('socialOptIn', '==', true)
      .where('socialVisible', '==', true)
      .limit(200)
      .get();

    const candidates = candidatesSnap.docs
      .map((d) => d.data())
      .filter((u) => u.uid !== userId);

    if (candidates.length === 0) {
      console.log('No candidates available for matching.');
      return;
    }

    // Check each candidate for the same med
    const matchCandidates: any[] = [];

    for (const candidate of candidates) {
      try {
        const medsSnap = await db
          .collection('userMeds')
          .doc(candidate.uid)
          .collection('items')
          .get();

        const hasSameMed = medsSnap.docs.some(
          (d) => normalizeMedName(d.data().name as string) === medNameKey,
        );

        if (hasSameMed) {
          // Check candidate doesn't already have a match for this med
          const candExisting = await db
            .collection('medMatches')
            .where('uids', 'array-contains', candidate.uid)
            .where('medNameKey', '==', medNameKey)
            .where('status', '==', 'matched')
            .limit(1)
            .get();

          if (candExisting.empty) {
            matchCandidates.push(candidate);
          }
        }
      } catch (err) {
        console.error(`Error checking meds for ${candidate.uid}:`, err);
      }
    }

    if (matchCandidates.length === 0) {
      console.log(`No mate found for ${medNameKey} (user: ${userId})`);
      return;
    }

    // Pick a random candidate
    const randomIndex = Math.floor(Math.random() * matchCandidates.length);
    const mate = matchCandidates[randomIndex];

    // Create the match
    const sortedUids = [userId, mate.uid].sort();
    const matchId = `${medNameKey}_${sortedUids.join('_')}`;

    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.doc(`medMatches/${matchId}`).set({
      id: matchId,
      uids: sortedUids,
      initiatorUid: userId,
      medNameKey,
      medDisplayName: medName,
      medForm,
      medColor,
      mateProfiles: {
        [userId]: {
          displayName: userData.displayName ?? 'User',
          photoURL: userData.photoURL ?? null,
          bio: userData.bio ?? '',
        },
        [mate.uid]: {
          displayName: mate.displayName ?? 'User',
          photoURL: mate.photoURL ?? null,
          bio: mate.bio ?? '',
        },
      },
      status: 'matched',
      createdAt: now,
      lastMessageAt: null,
    });

    console.log(
      `Med match created: ${userId} <-> ${mate.uid} for "${medName}" (match: ${matchId})`,
    );

    // TODO: Send push notification to both users about the match
  },
);
