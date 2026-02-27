/**
 * useMeds — React Query + Firestore hook for medication CRUD
 */

import { useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/src/lib/firebase';
import { useFirestoreQuery } from '@/src/lib/firestore-hooks';
import { useAuthStore } from '@/src/stores/auth-store';
import { generateId } from '@/src/lib/utils';
import type { Medication } from '@/src/types/firebase';

export function useMeds() {
  const user = useAuthStore((s) => s.user);

  const medsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(db, 'userMeds', user.uid, 'items'),
      orderBy('createdAt', 'desc'),
    );
  }, [user]);

  return useFirestoreQuery<Medication>({
    queryKey: ['meds', user?.uid],
    firestoreQuery: medsQuery,
    enabled: !!user,
  });
}

export function useAddMed() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (med: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user) throw new Error('Not authenticated');
      const id = generateId();

      // Strip undefined values from nested objects to prevent Firestore rejection
      const cleanObj = (obj: Record<string, unknown>) =>
        Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));

      const cleanSchedule = cleanObj(med.schedule as unknown as Record<string, unknown>);
      const cleanDuration = med.treatmentDuration
        ? cleanObj(med.treatmentDuration as unknown as Record<string, unknown>)
        : undefined;
      const cleanRefill = med.refill
        ? cleanObj(med.refill as unknown as Record<string, unknown>)
        : undefined;

      // Build document, omitting top-level undefined fields
      const raw: Record<string, unknown> = {
        ...med,
        schedule: cleanSchedule,
        ...(cleanDuration && { treatmentDuration: cleanDuration }),
        ...(cleanRefill && { refill: cleanRefill }),
        id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const medDoc = Object.fromEntries(
        Object.entries(raw).filter(([_, v]) => v !== undefined),
      ) as Medication;

      await setDoc(doc(db, 'userMeds', user.uid, 'items', id), medDoc);
      return medDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meds'] });
    },
  });
}

export function useDeleteMed() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (medId: string) => {
      if (!user) throw new Error('Not authenticated');
      await deleteDoc(doc(db, 'userMeds', user.uid, 'items', medId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meds'] });
    },
  });
}

export function useUpdateMed() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      medId,
      updates,
    }: {
      medId: string;
      updates: Partial<Medication>;
    }) => {
      if (!user) throw new Error('Not authenticated');
      await updateDoc(doc(db, 'userMeds', user.uid, 'items', medId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meds'] });
    },
  });
}
