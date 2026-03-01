/**
 * useMeds — React Query + Firestore hook for medication CRUD
 *
 * All mutations automatically schedule/cancel push notifications
 * via notification-service so reminders stay in sync with Firestore.
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
import {
  scheduleMedReminders,
  cancelMedReminders,
} from '@/src/features/notifications/notification-service';
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
    onSuccess: (medDoc) => {
      queryClient.invalidateQueries({ queryKey: ['meds'] });
      // Schedule push notifications for the new medication
      scheduleMedReminders(medDoc).catch(console.warn);
    },
  });
}

export function useDeleteMed() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (medId: string) => {
      if (!user) throw new Error('Not authenticated');
      // Cancel push notifications before deleting
      await cancelMedReminders(medId);
      await deleteDoc(doc(db, 'userMeds', user.uid, 'items', medId));
      return medId;
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
      return { medId, updates };
    },
    onSuccess: async ({ medId, updates }, _variables) => {
      queryClient.invalidateQueries({ queryKey: ['meds'] });

      // Reschedule notifications when schedule-related fields change
      const scheduleRelatedKeys: (keyof Medication)[] = [
        'schedule', 'reminderEnabled', 'reminderMinutesBefore', 'paused', 'name',
        'dosage', 'unit', 'color',
      ];
      const affectsSchedule = Object.keys(updates).some((k) =>
        scheduleRelatedKeys.includes(k as keyof Medication),
      );

      if (affectsSchedule) {
        // We need the full med doc to reschedule — read from cache
        const cachedMeds = queryClient.getQueryData<Medication[]>(['meds', user?.uid]);
        const fullMed = cachedMeds?.find((m) => m.id === medId);
        if (fullMed) {
          const merged = { ...fullMed, ...updates } as Medication;
          scheduleMedReminders(merged).catch(console.warn);
        }
      }
    },
  });
}
