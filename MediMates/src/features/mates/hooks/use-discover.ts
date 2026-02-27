/**
 * useDiscover — fetches potential mates (discover profiles) from Firestore.
 * Queries users with socialVisible=true, filters out already-liked/self.
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  collection,
  query,
  where,
  limit,
  doc,
  setDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { db } from '@/src/lib/firebase';
import { useAuthStore } from '@/src/stores/auth-store';
import { generateId, createPairId } from '@/src/lib/utils';
import type { DiscoverProfile, LikeDoc, UserProfile } from '@/src/types/firebase';

/**
 * Fetch discoverable profiles from Firestore, excluding self and already-liked.
 */
async function fetchDiscoverProfiles(uid: string): Promise<DiscoverProfile[]> {
  // 1. Get UIDs this user already liked
  const likesSnap = await getDocs(
    query(collection(db, 'likes'), where('fromUid', '==', uid)),
  );
  const likedUids = new Set(likesSnap.docs.map((d) => d.data().toUid as string));
  likedUids.add(uid); // exclude self

  // 2. Fetch visible users (limit to 50)
  const usersSnap = await getDocs(
    query(
      collection(db, 'users'),
      where('socialVisible', '==', true),
      where('socialOptIn', '==', true),
      limit(50),
    ),
  );

  const profiles: DiscoverProfile[] = [];
  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data() as UserProfile;
    if (likedUids.has(data.uid)) continue; // skip already liked or self

    profiles.push({
      uid: data.uid,
      displayName: data.displayName ?? 'User',
      avatarUrl: data.photoURL ?? null,
      age: 0, // age not stored in UserProfile
      visibleMeds: [], // will be populated below
      bio: data.bio ?? '',
    });
  }

  // 3. For each profile, fetch their visible meds (med names only)
  for (const profile of profiles) {
    try {
      const medsSnap = await getDocs(
        query(collection(db, 'userMeds', profile.uid, 'items'), limit(5)),
      );
      profile.visibleMeds = medsSnap.docs.map((d) => d.data().name as string);
    } catch {
      // If no meds, leave empty
    }
  }

  return profiles;
}

export function useDiscover() {
  const user = useAuthStore((s) => s.user);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: profiles, isLoading, refetch } = useQuery({
    queryKey: ['discover', user?.uid],
    queryFn: () => fetchDiscoverProfiles(user!.uid),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const currentProfile = (profiles ?? [])[currentIndex] ?? null;
  const hasMore = currentIndex < (profiles?.length ?? 0);

  const advance = useCallback(() => {
    setCurrentIndex((i) => i + 1);
  }, []);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    refetch();
  }, [refetch]);

  return {
    profiles: profiles ?? [],
    currentProfile,
    currentIndex,
    hasMore,
    advance,
    reset,
    isLoading,
  };
}

// ──────────────────────────────────────────────
// Like / Pass mutations
// ──────────────────────────────────────────────

export function useSendLike() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUid: string) => {
      if (!user) throw new Error('Not authenticated');
      const likeId = generateId();
      const likeDoc: LikeDoc = {
        id: likeId,
        fromUid: user.uid,
        toUid: targetUid,
        createdAt: Timestamp.now(),
      };
      await setDoc(doc(db, 'likes', likeId), likeDoc);
      return likeDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discover'] });
    },
  });
}
