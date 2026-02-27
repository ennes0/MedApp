/**
 * useNotifications — 3-tier system push notification handler
 *
 * - Registers notification categories on mount
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
  registerNotificationCategories,
  clearBadge,
  snoozeMedReminder,
  type NotificationData,
} from './notification-service';
import { useUIStore } from '@/src/stores/ui-store';

/**
 * Sets up notification listeners, category actions, and deep-link handling.
 */
export function useNotifications() {
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // ── Handle reminder response from push action buttons ──
  const handleReminderAction = useCallback(
    async (
      medId: string,
      time: string,
      action: 'taken' | 'snooze' | 'skip',
      data?: NotificationData,
    ) => {
      switch (action) {
        case 'taken':
          // TODO: Log dose as 'taken' in Firestore via useTodayDoses / logDose
          useUIStore.getState().showToast({
            type: 'success',
            title: 'Dose logged ✓',
            message: data?.medName
              ? `${data.medName} marked as taken`
              : 'Marked as taken',
          });
          break;

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

        case 'skip':
          // TODO: Log dose as 'skipped' in Firestore
          useUIStore.getState().showToast({
            type: 'info',
            title: 'Dose skipped',
            message: data?.medName ?? undefined,
          });
          break;
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
        const data = response.notification.request.content.data as NotificationData | undefined;
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
