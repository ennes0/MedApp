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
  getDoc,
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

export const RANDOM_MATCH_KEY = '__random__';

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
  mateProfile: MatchMateProfile | null;
}

export interface MatchMateProfile {
  uid: string;
  displayName: string;
  nickname?: string;
  photoURL: string | null;
  bio: string;
  badges?: import('@/src/types/firebase').UserBadge[];
  mateCount?: number;
  memberSince?: import('firebase/firestore').Timestamp;
}

function getMateProfileFromMatch(match: MedMatchDoc, currentUid: string): MatchMateProfile | null {
  const mateUid = match.uids.find((uid) => uid !== currentUid) ?? match.uids[0];
  const profile = match.mateProfiles?.[mateUid];
  if (!profile) return null;

  return {
    uid: mateUid,
    displayName: profile.displayName,
    nickname: profile.nickname,
    photoURL: profile.photoURL,
    bio: profile.bio,
  };
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

    const blockList = user.blockList ?? [];
    const matchMap = new Map<string, MedMatchDoc>();
    for (const match of matches ?? []) {
      // Skip matches where the mate is blocked
      const mateUid = match.uids.find((uid) => uid !== user.uid);
      if (mateUid && blockList.includes(mateUid)) continue;
      matchMap.set(match.medNameKey, match);
    }

    return meds.map((med) => {
      const key = normalizeMedName(med.name);
      const match = matchMap.get(key) ?? null;
      const mateProfile = match ? getMateProfileFromMatch(match, user.uid) : null;

      return { med, match, mateProfile };
    });
  }, [meds, matches, user]);

  return {
    medsWithMatches,
    isLoading: medsLoading || matchesLoading,
  };
}

export function useRandomMateMatch(): {
  randomMatch: MedMatchDoc | null;
  mateProfile: MatchMateProfile | null;
  isLoading: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const { data: matches, isLoading } = useMedMatches();

  const randomMatch = useMemo(() => {
    if (!matches || !user) return null;
    const blockList = user.blockList ?? [];

    return (
      matches.find((match) => {
        if (match.medNameKey !== RANDOM_MATCH_KEY) return false;
        const mateUid = match.uids.find((uid) => uid !== user.uid);
        if (!mateUid) return false;
        return !blockList.includes(mateUid);
      }) ?? null
    );
  }, [matches, user]);

  const mateProfile = useMemo(() => {
    if (!randomMatch || !user) return null;
    return getMateProfileFromMatch(randomMatch, user.uid);
  }, [randomMatch, user]);

  return {
    randomMatch,
    mateProfile,
    isLoading,
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

  // 0. Both users must be Pro — check current user first
  if (!userProfile.pro?.active) {
    console.log('[MedMatching] User is not Pro, skipping match.');
    return null;
  }

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
    .filter((u) => u.uid !== uid)
    .filter((u) => u.pro?.active === true) // Both users must be Pro
    .filter((u) => !u.suspended) // Exclude suspended users
    .filter((u) => {
      // Exclude users who blocked us or whom we blocked
      const ourBlockList = userProfile.blockList ?? [];
      const theirBlockList = u.blockList ?? [];
      return !ourBlockList.includes(u.uid) && !theirBlockList.includes(uid);
    });

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
        nickname: userProfile.nickname ?? '',
        photoURL: userProfile.photoURL ?? null,
        bio: userProfile.bio ?? '',
      },
      [mate.uid]: {
        displayName: mate.displayName ?? 'User',
        nickname: mate.nickname ?? '',
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

async function findAndCreateRandomMatch(
  uid: string,
  userProfile: UserProfile,
): Promise<MedMatchDoc | null> {
  if (!userProfile.pro?.active) {
    console.log('[MedMatching] User is not Pro, skipping random match.');
    return null;
  }

  const existingRandom = await getDocs(
    query(
      collection(db, 'medMatches'),
      where('uids', 'array-contains', uid),
      where('medNameKey', '==', RANDOM_MATCH_KEY),
      where('status', '==', 'matched'),
      limit(1),
    ),
  );
  if (!existingRandom.empty) {
    return existingRandom.docs[0].data() as MedMatchDoc;
  }

  const currentUserMedsSnap = await getDocs(collection(db, 'userMeds', uid, 'items'));
  const currentMedKeys = new Set(
    currentUserMedsSnap.docs
      .map((docSnap) => normalizeMedName((docSnap.data().name as string) ?? ''))
      .filter(Boolean),
  );

  const usersSnap = await getDocs(
    query(
      collection(db, 'users'),
      where('socialOptIn', '==', true),
      where('socialVisible', '==', true),
      limit(100),
    ),
  );

  const candidateUsers = usersSnap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => u.uid !== uid)
    .filter((u) => u.pro?.active === true)
    .filter((u) => !u.suspended)
    .filter((u) => {
      const ourBlockList = userProfile.blockList ?? [];
      const theirBlockList = u.blockList ?? [];
      return !ourBlockList.includes(u.uid) && !theirBlockList.includes(uid);
    });

  if (candidateUsers.length === 0) return null;

  const matchCandidates: UserProfile[] = [];

  for (const candidate of candidateUsers) {
    try {
      const medsSnap = await getDocs(collection(db, 'userMeds', candidate.uid, 'items'));
      const candidateMedKeys = medsSnap.docs.map((d) => normalizeMedName((d.data().name as string) ?? ''));
      const sharesAnyMedication = candidateMedKeys.some((key) => currentMedKeys.has(key));
      if (sharesAnyMedication) continue;

      const candidateRandom = await getDocs(
        query(
          collection(db, 'medMatches'),
          where('uids', 'array-contains', candidate.uid),
          where('medNameKey', '==', RANDOM_MATCH_KEY),
          where('status', '==', 'matched'),
          limit(1),
        ),
      );

      if (candidateRandom.empty) {
        matchCandidates.push(candidate);
      }
    } catch (err) {
      console.warn('[MedMatching] Error checking random candidate', candidate.uid, err);
    }
  }

  if (matchCandidates.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * matchCandidates.length);
  const mate = matchCandidates[randomIndex]!;

  const sortedUids = [uid, mate.uid].sort() as [string, string];
  const matchId = `${RANDOM_MATCH_KEY}_${sortedUids.join('_')}`;

  const matchDoc: MedMatchDoc = {
    id: matchId,
    uids: sortedUids,
    initiatorUid: uid,
    medNameKey: RANDOM_MATCH_KEY,
    medDisplayName: 'Random Match',
    medForm: null,
    medColor: '#8E8E93',
    mateProfiles: {
      [uid]: {
        displayName: userProfile.displayName ?? 'User',
        nickname: userProfile.nickname ?? '',
        photoURL: userProfile.photoURL ?? null,
        bio: userProfile.bio ?? '',
      },
      [mate.uid]: {
        displayName: mate.displayName ?? 'User',
        nickname: mate.nickname ?? '',
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

export function useFindRandomMate() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      return findAndCreateRandomMatch(user.uid, user);
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

// ──────────────────────────────────────────────
// Hook: Fetch full mate profile (with badges, mateCount, memberSince)
// ──────────────────────────────────────────────

export function useMateFullProfile(mateUid: string | undefined) {
  return useQuery({
    queryKey: ['mateProfile', mateUid],
    queryFn: async () => {
      if (!mateUid) return null;
      const userDoc = await getDoc(doc(db, 'users', mateUid));
      if (!userDoc.exists()) return null;
      const data = userDoc.data() as UserProfile;
      return {
        uid: data.uid,
        displayName: data.displayName,
        nickname: data.nickname ?? '',
        photoURL: data.photoURL,
        bio: data.bio,
        badges: data.badges ?? [],
        mateCount: data.mateCount ?? 0,
        memberSince: data.memberSince ?? data.createdAt,
      };
    },
    enabled: !!mateUid,
    staleTime: 5 * 60 * 1000,
  });
}
