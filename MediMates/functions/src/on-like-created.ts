/**
 * onLikeCreated — Firestore trigger.
 * When a like is created, check if mutual. If so, create a pair + chat doc.
 */

import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const onLikeCreated = onDocumentCreated('likes/{likeId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const like = snap.data();
  const { fromUid, toUid } = like as { fromUid: string; toUid: string };

  // Check if the other person has already liked us
  const mutualQuery = await db
    .collection('likes')
    .where('fromUid', '==', toUid)
    .where('toUid', '==', fromUid)
    .limit(1)
    .get();

  if (mutualQuery.empty) {
    // No mutual like yet
    return;
  }

  // Create a canonical pair ID
  const pairId = [fromUid, toUid].sort().join('_');

  // Check if pair already exists
  const existingPair = await db.doc(`pairs/${pairId}`).get();
  if (existingPair.exists) return;

  const now = admin.firestore.FieldValue.serverTimestamp();

  // Create pair document
  await db.doc(`pairs/${pairId}`).set({
    id: pairId,
    uids: [fromUid, toUid].sort(),
    chatId: pairId,
    createdAt: now,
    lastMessageAt: null,
  });

  // Create chat document
  await db.doc(`chats/${pairId}`).set({
    id: pairId,
    members: [fromUid, toUid].sort(),
    memberProfiles: {},
    lastMessage: '',
    lastMessageAt: null,
    createdAt: now,
    updatedAt: now,
  });

  // Populate member profiles
  const [profile1, profile2] = await Promise.all([
    db.doc(`users/${fromUid}`).get(),
    db.doc(`users/${toUid}`).get(),
  ]);

  const profiles: Record<string, { displayName: string; photoURL: string | null }> = {};

  if (profile1.exists) {
    const p = profile1.data()!;
    profiles[fromUid] = {
      displayName: p.displayName ?? 'User',
      photoURL: p.photoURL ?? null,
    };
  }

  if (profile2.exists) {
    const p = profile2.data()!;
    profiles[toUid] = {
      displayName: p.displayName ?? 'User',
      photoURL: p.photoURL ?? null,
    };
  }

  await db.doc(`chats/${pairId}`).update({ memberProfiles: profiles });

  // TODO: Send push notification to both users about the match

  console.log(`Match created: ${fromUid} <-> ${toUid} (pair: ${pairId})`);
});
