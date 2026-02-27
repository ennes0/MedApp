/**
 * Firestore hooks — React Query wrappers for Firestore real-time data
 *
 * Connects Firestore onSnapshot listeners with React Query for caching + dedup.
 */

import { useEffect } from 'react';
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type QueryKey,
} from '@tanstack/react-query';
import {
  onSnapshot,
  type Query,
  type DocumentReference,
  type DocumentData,
  type QuerySnapshot,
  type DocumentSnapshot,
} from 'firebase/firestore';

// ──────────────────────────────────────────────
// Collection query hook (real-time)
// ──────────────────────────────────────────────

interface UseFirestoreQueryOptions<T> {
  queryKey: QueryKey;
  firestoreQuery: Query<DocumentData> | null;
  transform?: (snap: QuerySnapshot<DocumentData>) => T[];
  enabled?: boolean;
}

export function useFirestoreQuery<T>({
  queryKey,
  firestoreQuery,
  transform,
  enabled = true,
}: UseFirestoreQueryOptions<T>) {
  const queryClient = useQueryClient();

  // Set up real-time listener
  useEffect(() => {
    if (!firestoreQuery || !enabled) return;

    const unsubscribe = onSnapshot(
      firestoreQuery,
      (snapshot) => {
        const data = transform
          ? transform(snapshot)
          : snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as T[];

        queryClient.setQueryData(queryKey, data);
      },
      (error) => {
        console.error('[Firestore] Query error:', error);
        queryClient.invalidateQueries({ queryKey });
      },
    );

    return () => unsubscribe();
  }, [firestoreQuery, enabled, queryKey, queryClient, transform]);

  return useQuery<T[]>({
    queryKey,
    queryFn: () => {
      // Data is populated by the onSnapshot listener above.
      // Return existing cache or empty array as initial.
      return queryClient.getQueryData(queryKey) ?? ([] as T[]);
    },
    enabled,
    staleTime: Infinity, // Data is kept fresh by the listener
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// ──────────────────────────────────────────────
// Single document hook (real-time)
// ──────────────────────────────────────────────

interface UseFirestoreDocOptions<T> {
  queryKey: QueryKey;
  docRef: DocumentReference<DocumentData> | null;
  transform?: (snap: DocumentSnapshot<DocumentData>) => T;
  enabled?: boolean;
}

export function useFirestoreDoc<T>({
  queryKey,
  docRef,
  transform,
  enabled = true,
}: UseFirestoreDocOptions<T>) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!docRef || !enabled) return;

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          queryClient.setQueryData(queryKey, null);
          return;
        }
        const data = transform
          ? transform(snapshot)
          : ({ id: snapshot.id, ...snapshot.data() } as T);

        queryClient.setQueryData(queryKey, data);
      },
      (error) => {
        console.error('[Firestore] Doc error:', error);
        queryClient.invalidateQueries({ queryKey });
      },
    );

    return () => unsubscribe();
  }, [docRef, enabled, queryKey, queryClient, transform]);

  return useQuery<T | null>({
    queryKey,
    queryFn: () => {
      return queryClient.getQueryData(queryKey) ?? null;
    },
    enabled,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
