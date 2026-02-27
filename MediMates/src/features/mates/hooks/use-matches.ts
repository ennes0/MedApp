/**
 * useMatches — fetches matched pairs for the current user from Firestore.
 */

import { useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useFirestoreQuery } from '@/src/lib/firestore-hooks';
import { useAuthStore } from '@/src/stores/auth-store';
import type { PairDoc } from '@/src/types/firebase';

export function useMatches() {
  const user = useAuthStore((s) => s.user);

  const matchesQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(db, 'pairs'),
      where('uids', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc'),
    );
  }, [user]);

  return useFirestoreQuery<PairDoc>({
    queryKey: ['matches', user?.uid],
    firestoreQuery: matchesQuery,
    enabled: !!user,
  });
}
