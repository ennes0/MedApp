/**
 * useNotifications — 3-tier system push notification handler
 *
 * - Registers notification categories on mount
 * - Reschedules all medication reminders on app start (from Firestore data)
 * - Handles notification response actions (TAKEN / SNOOZE / SKIP)
 * - Snooze reschedules +10 min via notification-service
 * - No in-app notifications — all reminders are system push notifications
 *
 * Mount once at root level (app/_layout.tsx → RootNavigator).
 */

import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { db } from '@/src/lib/firebase';
import {
  registerNotificationCategories,
  clearBadge,
  snoozeMedReminder,
  rescheduleAllReminders,
  type NotificationData,
} from './notification-service';
import { useUIStore } from '@/src/stores/ui-store';
import { useAuthStore } from '@/src/stores/auth-store';
import { useMeds } from '@/src/features/meds/hooks/use-meds';
import type { DayLog, DoseLogEntry } from '@/src/types/firebase';

/**
 * Direct Firestore dose logging — used from notification action callbacks.
 * Cannot use React hooks here since this runs outside component lifecycle.
 * Mirrors the logic from useLogDose in use-today-doses.ts.
 */
async function logDoseFromNotification(
  medId: string,
  scheduledTime: string,
  status: 'taken' | 'skipped',
  data?: NotificationData,
): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) {
    console.warn('[Notifications] No user in store — cannot log dose');
    return;
  }

  const tz = user.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const zoned = toZonedTime(now, tz);
  const dateStr = format(zoned, 'yyyy-MM-dd');

  const logDocRef = doc(db, 'userMeds', user.uid, 'dayLogs', dateStr);
  const snap = await getDoc(logDocRef);
  const existingEntries: DoseLogEntry[] = snap.exists()
    ? (snap.data()?.entries ?? [])
    : [];

  // Find existing entry or create new one
  const entryIndex = existingEntries.findIndex(
    (e) => e.medId === medId && e.scheduledTime === scheduledTime,
  );

  const newEntry: DoseLogEntry = {
    medId,
    medName: data?.medName ?? '',
    scheduledTime,
    status,
    loggedAt: Timestamp.now(),
    note: '',
  };

  if (entryIndex >= 0) {
    existingEntries[entryIndex] = newEntry;
  } else {
    existingEntries.push(newEntry);
  }

  const logData: DayLog = {
    date: dateStr,
    entries: existingEntries,
    updatedAt: Timestamp.now(),
  };

  await setDoc(logDocRef, logData);
  console.log(`[Notifications] Dose logged: ${medId} ${scheduledTime} → ${status}`);
}

/**
 * Sets up notification listeners, category actions, and deep-link handling.
 */
export function useNotifications() {
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const hasScheduledRef = useRef(false);
  const { data: meds } = useMeds();

  // ── Reschedule all reminders on app start (once) ──
  useEffect(() => {
    if (!meds || meds.length === 0 || hasScheduledRef.current) return;
    hasScheduledRef.current = true;
    rescheduleAllReminders(meds).catch(console.warn);
  }, [meds]);

  // ── Handle reminder response from push action buttons ──
  const handleReminderAction = useCallback(
    async (
      medId: string,
      time: string,
      action: 'taken' | 'snooze' | 'skip',
      data?: NotificationData,
    ) => {
      switch (action) {
        case 'taken': {
          // Log dose as 'taken' in Firestore directly (not via hook, since this is a callback)
          try {
            await logDoseFromNotification(medId, time, 'taken', data);
          } catch (err) {
            console.error('[Notifications] Failed to log taken dose:', err);
          }
          useUIStore.getState().showToast({
            type: 'success',
            title: 'Dose logged ✓',
            message: data?.medName
              ? `${data.medName} marked as taken`
              : 'Marked as taken',
          });
          break;
        }

        case 'snooze':
          // Reschedule +10 min push notification
          if (data) {
            await snoozeMedReminder(
              {
                id: data.medId,
                name: data.medName,
                color: data.medColor ?? '#007AFF',
                dosage: data.dosage,
                unit: data.unit,
              } as any,
              data.time,
            );
          }
          useUIStore.getState().showToast({
            type: 'info',
            title: 'Snoozed',
            message: 'Reminder in 10 minutes',
          });
          break;

        case 'skip': {
          // Log dose as 'skipped' in Firestore
          try {
            await logDoseFromNotification(medId, time, 'skipped', data);
          } catch (err) {
            console.error('[Notifications] Failed to log skipped dose:', err);
          }
          useUIStore.getState().showToast({
            type: 'info',
            title: 'Dose skipped',
            message: data?.medName ?? undefined,
          });
          break;
        }
      }
    },
    [],
  );

  useEffect(() => {
    // Register notification categories
    registerNotificationCategories();

    // ── User interacted with a push notification ──
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as unknown as NotificationData | undefined;
        const actionId = response.actionIdentifier;

        if (!data) {
          // Fallback: navigate to today tab
          router.push('/(tabs)');
          return;
        }

        // Handle action button taps
        if (actionId === 'TAKEN') {
          handleReminderAction(data.medId, data.time, 'taken', data);
        } else if (actionId === 'SNOOZE') {
          handleReminderAction(data.medId, data.time, 'snooze', data);
        } else if (actionId === 'SKIP') {
          handleReminderAction(data.medId, data.time, 'skip', data);
        } else if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          // User tapped the notification itself → navigate to today
          router.push('/(tabs)');
        }
      });

    // Clear badge when app comes to foreground
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        clearBadge();
      }
    });

    // Clear badge on initial mount
    clearBadge();

    return () => {
      responseListener.current?.remove();
      subscription?.remove();
    };
  }, [router, handleReminderAction]);
}
