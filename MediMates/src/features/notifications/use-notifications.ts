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
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc as firestoreUpdateDoc,
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
  scheduleRefillLowStockNotification,
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
  status: 'taken' | 'skipped' | 'snoozed',
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

  // Decrement refill stock when dose is taken from notification
  if (status === 'taken') {
    try {
      const medDocRef = doc(db, 'userMeds', user.uid, 'items', medId);
      const medSnap = await getDoc(medDocRef);
      if (medSnap.exists()) {
        const medData = medSnap.data();
        if (medData?.refill?.enabled && typeof medData.refill.currentStock === 'number' && medData.refill.currentStock > 0) {
          const { updateDoc } = await import('firebase/firestore');
          const newStock = Math.max(0, medData.refill.currentStock - (medData.doseQuantity ?? 1));
          await updateDoc(medDocRef, { 'refill.currentStock': newStock });
          // Trigger refill low-stock notification if needed
          await scheduleRefillLowStockNotification({
            id: medId,
            name: data?.medName ?? medData.name ?? '',
            color: data?.medColor ?? medData.color ?? '#007AFF',
            dosage: data?.dosage ?? medData.dosage ?? '',
            unit: data?.unit ?? medData.unit ?? '',
            refill: {
              currentStock: newStock,
              refillAt: medData.refill.refillAt,
            },
          });
        }
      }
    } catch (err) {
      console.warn('[Notifications] Failed to decrement refill stock:', err);
    }
  }
}

/**
 * Sets up notification listeners, category actions, and deep-link handling.
 */
/**
 * Register Expo push token and save it to Firestore for remote notifications.
 */
async function registerPushToken(): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('[Notifications] No projectId found — cannot register push token');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    if (token) {
      // Save to Firestore
      await firestoreUpdateDoc(doc(db, 'users', user.uid), {
        expoPushToken: token,
      });
      console.log('[Notifications] Push token registered:', token.substring(0, 20) + '...');
    }
  } catch (err) {
    console.warn('[Notifications] Failed to register push token:', err);
  }
}

export function useNotifications() {
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const hasScheduledRef = useRef(false);
  const hasPushTokenRef = useRef(false);
  const handledResponseKeysRef = useRef<Set<string>>(new Set());
  const { data: meds } = useMeds();

  // ── Register Expo push token (once) ──
  useEffect(() => {
    if (hasPushTokenRef.current) return;
    hasPushTokenRef.current = true;
    registerPushToken().catch(console.warn);
  }, []);

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
          try {
            await logDoseFromNotification(medId, time, 'snoozed', data);
          } catch (err) {
            console.error('[Notifications] Failed to log snoozed dose:', err);
          }
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

  const processNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse | null) => {
      if (!response) return;

      const notificationId = response.notification.request.identifier;
      const actionId = response.actionIdentifier;
      const responseKey = `${notificationId}:${actionId}`;
      if (handledResponseKeysRef.current.has(responseKey)) return;
      handledResponseKeysRef.current.add(responseKey);

      const data = response.notification.request.content.data as any;

      if (!data) {
        router.push('/(tabs)');
        return;
      }

      if (data.type === 'chat_message' && data.matchId) {
        router.push({
          pathname: '/(tabs)/inbox/[chatId]',
          params: { chatId: data.matchId },
        });
        return;
      }

      if (data.type === 'mate_match') {
        router.push('/(tabs)/inbox');
        return;
      }

      const notifData = data as NotificationData | undefined;
      if (actionId === 'TAKEN' && notifData) {
        await handleReminderAction(notifData.medId, notifData.time, 'taken', notifData);
      } else if (actionId === 'SNOOZE' && notifData) {
        await handleReminderAction(notifData.medId, notifData.time, 'snooze', notifData);
      } else if (actionId === 'SKIP' && notifData) {
        await handleReminderAction(notifData.medId, notifData.time, 'skip', notifData);
      } else if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        router.push('/(tabs)');
      }
    },
    [handleReminderAction, router],
  );

  useEffect(() => {
    // Register notification categories
    registerNotificationCategories();

    Notifications.getLastNotificationResponseAsync()
      .then((response) => processNotificationResponse(response))
      .catch(console.warn);

    // ── User interacted with a push notification ──
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        processNotificationResponse(response).catch((err) => {
          console.warn('[Notifications] Failed to process notification response:', err);
        });
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
  }, [processNotificationResponse]);
}
