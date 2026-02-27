/**
 * useMedMatching — Automatic 1:1 medication-based matching system.
 *
 * For each of the user's medications, finds ONE random mate who takes the same med.
 * Each medication → exactly 1 mate. Matches are stored in 'medMatches' collection.
 */

import { useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  Timestamp,
  serverTimestamp,
  collectionGroup,
} from 'firebase/firestore';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { db } from '@/src/lib/firebase';
import { useFirestoreQuery } from '@/src/lib/firestore-hooks';
import { useAuthStore } from '@/src/stores/auth-store';
import { generateId, createPairId } from '@/src/lib/utils';
import { useMeds } from '@/src/features/meds/hooks/use-meds';
import type { MedMatchDoc, Medication, MedicationForm, UserProfile } from '@/src/types/firebase';

// ──────────────────────────────────────────────
// Normalize med name for comparison
// ──────────────────────────────────────────────

export function normalizeMedName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ──────────────────────────────────────────────
// Hook: Get all existing matches for current user
// ──────────────────────────────────────────────

export function useMedMatches() {
  const user = useAuthStore((s) => s.user);

  const matchesQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(db, 'medMatches'),
      where('uids', 'array-contains', user.uid),
      where('status', '==', 'matched'),
      orderBy('createdAt', 'desc'),
    );
  }, [user]);

  return useFirestoreQuery<MedMatchDoc>({
    queryKey: ['medMatches', user?.uid],
    firestoreQuery: matchesQuery,
    enabled: !!user,
  });
}

// ──────────────────────────────────────────────
// Hook: Get med matches grouped by medication
// ──────────────────────────────────────────────

export interface MedWithMatch {
  med: Medication;
  match: MedMatchDoc | null;
  mateProfile: {
    uid: string;
    displayName: string;
    photoURL: string | null;
    bio: string;
  } | null;
}

export function useMedsWithMatches(): {
  medsWithMatches: MedWithMatch[];
  isLoading: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const { data: meds, isLoading: medsLoading } = useMeds();
  const { data: matches, isLoading: matchesLoading } = useMedMatches();

  const medsWithMatches = useMemo(() => {
    if (!meds || !user) return [];

    const matchMap = new Map<string, MedMatchDoc>();
    for (const match of matches ?? []) {
      matchMap.set(match.medNameKey, match);
    }

    return meds.map((med) => {
      const key = normalizeMedName(med.name);
      const match = matchMap.get(key) ?? null;
      let mateProfile = null;

      if (match) {
        const mateUid = match.uids.find((uid) => uid !== user.uid) ?? match.uids[0];
        const profile = match.mateProfiles?.[mateUid];
        if (profile) {
          mateProfile = {
            uid: mateUid,
            displayName: profile.displayName,
            photoURL: profile.photoURL,
            bio: profile.bio,
          };
        }
      }

      return { med, match, mateProfile };
    });
  }, [meds, matches, user]);

  return {
    medsWithMatches,
    isLoading: medsLoading || matchesLoading,
  };
}

// ──────────────────────────────────────────────
// Mutation: Find a mate for a specific medication
// ──────────────────────────────────────────────

async function findAndCreateMatch(
  uid: string,
  med: Medication,
  userProfile: UserProfile,
): Promise<MedMatchDoc | null> {
  const medNameKey = normalizeMedName(med.name);

  // 1. Check if match already exists for this med
  const existingSnap = await getDocs(
    query(
      collection(db, 'medMatches'),
      where('uids', 'array-contains', uid),
      where('medNameKey', '==', medNameKey),
      where('status', '==', 'matched'),
      limit(1),
    ),
  );
  if (!existingSnap.empty) {
    return existingSnap.docs[0].data() as MedMatchDoc;
  }

  // 2. Get all users who have socialOptIn + socialVisible
  const usersSnap = await getDocs(
    query(
      collection(db, 'users'),
      where('socialOptIn', '==', true),
      where('socialVisible', '==', true),
      limit(100),
    ),
  );

  // Filter out self
  const candidateUsers = usersSnap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => u.uid !== uid);

  if (candidateUsers.length === 0) return null;

  // 3. For each candidate, check if they have the same med
  const matchCandidates: UserProfile[] = [];

  for (const candidate of candidateUsers) {
    try {
      const medsSnap = await getDocs(
        collection(db, 'userMeds', candidate.uid, 'items'),
      );
      const hasSameMed = medsSnap.docs.some(
        (d) => normalizeMedName(d.data().name as string) === medNameKey,
      );
      if (hasSameMed) {
        // Also check they don't already have a match with current user for this med
        const existingPair = await getDocs(
          query(
            collection(db, 'medMatches'),
            where('uids', 'array-contains', candidate.uid),
            where('medNameKey', '==', medNameKey),
            where('status', '==', 'matched'),
            limit(1),
          ),
        );
        if (existingPair.empty) {
          matchCandidates.push(candidate);
        }
      }
    } catch (err) {
      console.warn('[MedMatching] Error checking meds for', candidate.uid, err);
    }
  }

  if (matchCandidates.length === 0) return null;

  // 4. Pick a random candidate
  const randomIndex = Math.floor(Math.random() * matchCandidates.length);
  const mate = matchCandidates[randomIndex]!;

  // 5. Create the match document
  const sortedUids = [uid, mate.uid].sort() as [string, string];
  const matchId = `${medNameKey}_${sortedUids.join('_')}`;

  const matchDoc: MedMatchDoc = {
    id: matchId,
    uids: sortedUids,
    initiatorUid: uid,
    medNameKey,
    medDisplayName: med.name,
    medForm: (med.form as MedicationForm) ?? null,
    medColor: med.color ?? '#007AFF',
    mateProfiles: {
      [uid]: {
        displayName: userProfile.displayName ?? 'User',
        photoURL: userProfile.photoURL ?? null,
        bio: userProfile.bio ?? '',
      },
      [mate.uid]: {
        displayName: mate.displayName ?? 'User',
        photoURL: mate.photoURL ?? null,
        bio: mate.bio ?? '',
      },
    },
    status: 'matched',
    createdAt: Timestamp.now(),
    lastMessageAt: null,
  };

  await setDoc(doc(db, 'medMatches', matchId), matchDoc);
  return matchDoc;
}

export function useFindMateForMed() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (med: Medication) => {
      if (!user) throw new Error('Not authenticated');
      return findAndCreateMatch(user.uid, med, user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medMatches'] });
    },
  });
}

// ──────────────────────────────────────────────
// Hook: Chat within a med match
// ──────────────────────────────────────────────

export function useMedMatchChat(matchId: string) {
  const messagesQuery = useMemo(() => {
    if (!matchId) return null;
    return query(
      collection(db, 'medMatches', matchId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
  }, [matchId]);

  return useFirestoreQuery<import('@/src/types/firebase').MessageDoc>({
    queryKey: ['medMatchMessages', matchId],
    firestoreQuery: messagesQuery,
    enabled: !!matchId,
  });
}

export function useSendMedMatchMessage(matchId: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error('Not authenticated');
      const id = generateId();
      const msg = {
        id,
        pairId: matchId,
        senderUid: user.uid,
        text,
        createdAt: Timestamp.now(),
        readBy: [user.uid],
      };
      await setDoc(doc(db, 'medMatches', matchId, 'messages', id), msg);
      // Update match's lastMessageAt
      await updateDoc(doc(db, 'medMatches', matchId), {
        lastMessageAt: serverTimestamp(),
      });
      return msg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medMatchMessages', matchId] });
    },
  });
}
