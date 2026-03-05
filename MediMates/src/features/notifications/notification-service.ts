/**
 * Notification Service — 3-tier medication reminder system
 *
 * For each scheduled dose, we create up to 3 notifications:
 *   1. PRE_10  — 10 minutes before (gentle heads-up)
 *   2. PRE_5   — 5 minutes before  (get ready)
 *   3. MAIN    — at scheduled time  (persistent, requires action)
 *
 * Notification identifiers:
 *   med-{medId}-{HHmm}-pre10
 *   med-{medId}-{HHmm}-pre5
 *   med-{medId}-{HHmm}-main
 *   med-{medId}-{HHmm}-d{day}-pre10  (specific-day variant)
 *   etc.
 *
 * Categories:
 *   MED_PRE_REMINDER  — no actions (auto-dismiss)
 *   MED_MAIN_REMINDER — Taken / Snooze 10 min / Skip
 *
 * Works on development builds with expo-notifications.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Medication, MedSchedule } from '@/src/types/firebase';

// ──────────────────────────────────────────────
// Time formatting helper
// ──────────────────────────────────────────────

function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ──────────────────────────────────────────────
// Notification handler (foreground behavior)
// ──────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as NotificationData | undefined;
    const isMain = data?.tier === 'main';

    return {
      shouldShowAlert: true,
      shouldPlaySound: true, // Play sound for all tiers so notifications appear as banners
      shouldSetBadge: isMain,
    };
  },
});

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type NotificationTier = 'pre_10' | 'pre_5' | 'main';

export interface NotificationData {
  medId: string;
  medName: string;
  medColor?: string;
  medForm?: string;
  dosage: string;
  unit: string;
  time: string; // HH:mm
  tier: NotificationTier;
  day?: number;
}

// ──────────────────────────────────────────────
// Permission helpers
// ──────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowCriticalAlerts: false,
      allowProvisional: false,
    },
  });
  return status === 'granted';
}

export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// ──────────────────────────────────────────────
// Notification categories (iOS actions)
// ──────────────────────────────────────────────

export async function registerNotificationCategories(): Promise<void> {
  // Pre-reminder category — no action buttons, informational only
  await Notifications.setNotificationCategoryAsync('MED_PRE_REMINDER', []);

  // Main reminder category — requires user response
  await Notifications.setNotificationCategoryAsync('MED_MAIN_REMINDER', [
    {
      identifier: 'TAKEN',
      buttonTitle: 'Mark as Taken ✓',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'SNOOZE',
      buttonTitle: 'Snooze 10 min',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'SKIP',
      buttonTitle: 'Skip',
      isDestructive: true,
      options: { opensAppToForeground: false },
    },
  ]);
}

// ──────────────────────────────────────────────
// ID builders
// ──────────────────────────────────────────────

function buildBaseId(medId: string, time: string): string {
  return `med-${medId}-${time.replace(':', '')}`;
}

function buildTieredId(
  medId: string,
  time: string,
  tier: NotificationTier,
  day?: number,
): string {
  const base = buildBaseId(medId, time);
  const daySuffix = day !== undefined ? `-d${day}` : '';
  return `${base}${daySuffix}-${tier}`;
}

// ──────────────────────────────────────────────
// Notification content builders
// ──────────────────────────────────────────────

function buildPreContent(
  med: Medication,
  time: string,
  minutesBefore: number,
): Notifications.NotificationContentInput {
  const tier: NotificationTier = minutesBefore === 10 ? 'pre_10' : 'pre_5';
  const formattedTime = formatTime12h(time);
  return {
    title: minutesBefore === 10
      ? `⏰ ${med.name} in 10 minutes`
      : `⏰ ${med.name} in 5 minutes`,
    subtitle: 'MediMates Reminder',
    body: minutesBefore === 10
      ? `Get ready — ${med.dosage} ${med.unit} at ${formattedTime}`
      : `Almost time — ${med.dosage} ${med.unit} at ${formattedTime}`,
    sound: 'default', // Sound required for banner display on iOS
    data: {
      medId: med.id,
      medName: med.name,
      medColor: med.color,
      medForm: med.form,
      dosage: med.dosage,
      unit: med.unit,
      time,
      tier,
    } satisfies NotificationData,
    categoryIdentifier: 'MED_PRE_REMINDER',
  };
}

function buildMainContent(
  med: Medication,
  time: string,
): Notifications.NotificationContentInput {
  const formattedTime = formatTime12h(time);
  return {
    title: `💊 Time to take ${med.name}`,
    subtitle: 'MediMates',
    body: `${med.dosage} ${med.unit} — scheduled for ${formattedTime}`,
    sound: 'default',
    badge: 1,
    data: {
      medId: med.id,
      medName: med.name,
      medColor: med.color,
      medForm: med.form,
      dosage: med.dosage,
      unit: med.unit,
      time,
      tier: 'main',
    } satisfies NotificationData,
    categoryIdentifier: 'MED_MAIN_REMINDER',
  };
}

// ──────────────────────────────────────────────
// Trigger builders
// ──────────────────────────────────────────────

/**
 * Subtract minutes from an hour:minute pair, wrapping around midnight.
 * Returns adjusted time and whether midnight was crossed (for weekday adjustment).
 */
function subtractMinutes(
  hour: number,
  minute: number,
  offsetMinutes: number,
): { hour: number; minute: number; crossedMidnight: boolean } {
  let totalMinutes = hour * 60 + minute - offsetMinutes;
  const crossedMidnight = totalMinutes < 0;
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  return {
    hour: Math.floor(totalMinutes / 60) % 24,
    minute: totalMinutes % 60,
    crossedMidnight,
  };
}

function buildDailyTrigger(
  hour: number,
  minute: number,
): Notifications.NotificationTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
  };
}

function buildWeeklyTrigger(
  weekday: number,
  hour: number,
  minute: number,
): Notifications.NotificationTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday,
    hour,
    minute,
  };
}

// ──────────────────────────────────────────────
// Core scheduling
// ──────────────────────────────────────────────

/**
 * Schedule all 3-tier notifications for a single medication.
 * Cancels any existing ones for that med first.
 */
export async function scheduleMedReminders(med: Medication): Promise<void> {
  await cancelMedReminders(med.id);

  if (!med.reminderEnabled || med.paused) return;
  if (med.schedule.frequency === 'as_needed') return;

  const { times, frequency, daysOfWeek } = med.schedule;

  for (const time of times) {
    const [hStr, mStr] = time.split(':');
    const hour = parseInt(hStr, 10);
    const minute = parseInt(mStr, 10);

    if (frequency === 'specific_days' && daysOfWeek?.length) {
      // Schedule for each selected day of the week
      for (const day of daysOfWeek) {
        const expoWeekday = (day % 7) + 1; // Expo: 1=Sun...7=Sat
        await scheduleThreeTierForWeekly(med, time, hour, minute, expoWeekday, day);
      }
    } else if (frequency === 'every_x_hours') {
      // For interval-based, we can only use TIME_INTERVAL — schedule one main reminder
      const seconds = (med.schedule.intervalHours ?? 4) * 3600;
      await Notifications.scheduleNotificationAsync({
        identifier: buildTieredId(med.id, time, 'main'),
        content: buildMainContent(med, time),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: true,
        },
      });
    } else {
      // daily, weekly, monthly, x_times_daily, cyclical → use daily triggers
      await scheduleThreeTierForDaily(med, time, hour, minute);
    }
  }
}

/**
 * Schedule pre_10, pre_5, main for a daily trigger.
 */
async function scheduleThreeTierForDaily(
  med: Medication,
  time: string,
  hour: number,
  minute: number,
): Promise<void> {
  // Pre 10 min
  const pre10 = subtractMinutes(hour, minute, 10);
  await Notifications.scheduleNotificationAsync({
    identifier: buildTieredId(med.id, time, 'pre_10'),
    content: buildPreContent(med, time, 10),
    trigger: buildDailyTrigger(pre10.hour, pre10.minute),
  });

  // Pre 5 min
  const pre5 = subtractMinutes(hour, minute, 5);
  await Notifications.scheduleNotificationAsync({
    identifier: buildTieredId(med.id, time, 'pre_5'),
    content: buildPreContent(med, time, 5),
    trigger: buildDailyTrigger(pre5.hour, pre5.minute),
  });

  // Main
  await Notifications.scheduleNotificationAsync({
    identifier: buildTieredId(med.id, time, 'main'),
    content: buildMainContent(med, time),
    trigger: buildDailyTrigger(hour, minute),
  });
}

/**
 * Schedule pre_10, pre_5, main for a weekly trigger (specific day).
 * Handles midnight crossing — if subtracting time crosses midnight,
 * adjusts the weekday to the previous day.
 */
async function scheduleThreeTierForWeekly(
  med: Medication,
  time: string,
  hour: number,
  minute: number,
  expoWeekday: number,
  day: number,
): Promise<void> {
  // Helper: adjust weekday if time subtraction crossed midnight
  const adjustWeekday = (wd: number, crossed: boolean) => {
    if (!crossed) return wd;
    return wd === 1 ? 7 : wd - 1; // Expo weekday: 1=Sun..7=Sat
  };

  // Pre 10 min
  const pre10 = subtractMinutes(hour, minute, 10);
  await Notifications.scheduleNotificationAsync({
    identifier: buildTieredId(med.id, time, 'pre_10', day),
    content: buildPreContent(med, time, 10),
    trigger: buildWeeklyTrigger(
      adjustWeekday(expoWeekday, pre10.crossedMidnight),
      pre10.hour,
      pre10.minute,
    ),
  });

  // Pre 5 min
  const pre5 = subtractMinutes(hour, minute, 5);
  await Notifications.scheduleNotificationAsync({
    identifier: buildTieredId(med.id, time, 'pre_5', day),
    content: buildPreContent(med, time, 5),
    trigger: buildWeeklyTrigger(
      adjustWeekday(expoWeekday, pre5.crossedMidnight),
      pre5.hour,
      pre5.minute,
    ),
  });

  // Main
  await Notifications.scheduleNotificationAsync({
    identifier: buildTieredId(med.id, time, 'main', day),
    content: buildMainContent(med, time),
    trigger: buildWeeklyTrigger(expoWeekday, hour, minute),
  });
}

// Legacy alias — kept for backward compat
export const scheduleMedRemindersForAllDays = scheduleMedReminders;

// ──────────────────────────────────────────────
// Refill Low Stock Notification
// ──────────────────────────────────────────────

/**
 * Schedule a one-time notification when medication stock is running low.
 * Called after a dose is taken and stock decremented.
 * Only fires once per low-stock event (uses unique identifier to prevent duplicates).
 */
export async function scheduleRefillLowStockNotification(
  med: Pick<Medication, 'id' | 'name' | 'color' | 'dosage' | 'unit'> & {
    refill?: { currentStock?: number; refillAt?: number };
  },
): Promise<void> {
  if (!med.refill) return;
  const { currentStock, refillAt } = med.refill;
  if (currentStock == null || refillAt == null) return;
  if (currentStock > refillAt) return; // Not low yet
  if (currentStock <= 0) {
    // Out of stock notification
    const outId = `refill-empty-${med.id}`;
    try {
      await Notifications.cancelScheduledNotificationAsync(outId);
    } catch { /* ignore */ }
    await Notifications.scheduleNotificationAsync({
      identifier: outId,
      content: {
        title: `🚨 ${med.name} — Out of Stock!`,
        subtitle: 'MediMates Refill',
        body: `You have no ${med.name} left. Time to refill your prescription.`,
        sound: 'default',
        badge: 1,
        data: { medId: med.id, medName: med.name, type: 'refill_empty' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
        repeats: false,
      },
    });
    return;
  }

  // Low stock notification
  const lowId = `refill-low-${med.id}`;
  // Check if we already sent this notification recently (prevent duplicates)
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const alreadyScheduled = scheduled.some((n) => n.identifier === lowId);
  if (alreadyScheduled) return;

  await Notifications.scheduleNotificationAsync({
    identifier: lowId,
    content: {
      title: `⚠️ ${med.name} — Running Low`,
      subtitle: 'MediMates Refill',
      body: `Only ${currentStock} dose${currentStock !== 1 ? 's' : ''} remaining. Consider refilling soon.`,
      sound: 'default',
      data: { medId: med.id, medName: med.name, type: 'refill_low' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      repeats: false,
    },
  });
}

// ──────────────────────────────────────────────
// Snooze — reschedule +10 min from now
// ──────────────────────────────────────────────

export async function snoozeMedReminder(
  med: Pick<Medication, 'id' | 'name' | 'color' | 'dosage' | 'unit'>,
  time: string,
): Promise<void> {
  const snoozeId = `${buildBaseId(med.id, time)}-snooze`;
  // Cancel any previous snooze for this slot
  try {
    await Notifications.cancelScheduledNotificationAsync(snoozeId);
  } catch {
    // ignore — may not exist
  }

  await Notifications.scheduleNotificationAsync({
    identifier: snoozeId,
    content: {
      title: `⏰ Snoozed — ${med.name}`,
      subtitle: 'MediMates',
      body: `${med.dosage} ${med.unit} — snoozed reminder`,
      sound: 'default',
      badge: 1,
      data: {
        medId: med.id,
        medName: med.name,
        medColor: med.color,
        dosage: med.dosage,
        unit: med.unit,
        time,
        tier: 'main',
      } satisfies NotificationData,
      categoryIdentifier: 'MED_MAIN_REMINDER',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10 * 60, // 10 minutes
      repeats: false,
    },
  });
}

// ──────────────────────────────────────────────
// Cancel helpers
// ──────────────────────────────────────────────

/**
 * Cancel all notifications for a given medication.
 */
export async function cancelMedReminders(medId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter((n) => n.identifier.startsWith(`med-${medId}`));
  await Promise.all(
    toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Cancel ALL medication notifications.
 */
export async function cancelAllMedReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter((n) => n.identifier.startsWith('med-'));
  await Promise.all(
    toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Reschedule all medication reminders (e.g., after timezone change).
 */
export async function rescheduleAllReminders(meds: Medication[]): Promise<void> {
  await cancelAllMedReminders();
  for (const med of meds) {
    await scheduleMedReminders(med);
  }
}

// ──────────────────────────────────────────────
// Debug — list all scheduled notifications
// ──────────────────────────────────────────────

export async function listScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  return Notifications.getAllScheduledNotificationsAsync();
}

// ──────────────────────────────────────────────
// Badge
// ──────────────────────────────────────────────

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// ──────────────────────────────────────────────
// Send immediate test notification (for dev)
// ──────────────────────────────────────────────

export async function sendTestNotification(
  tier: NotificationTier = 'main',
): Promise<void> {
  const testData: NotificationData = {
    medId: 'test-123',
    medName: 'Vitamin D',
    medColor: '#FF9F0A',
    dosage: '1000',
    unit: 'IU',
    time: '08:00',
    tier,
  };

  const isMain = tier === 'main';

  const titles: Record<NotificationTier, string> = {
    pre_10: '⏰ Vitamin D in 10 minutes',
    pre_5: '⏰ Vitamin D in 5 minutes',
    main: '💊 Time to take Vitamin D',
  };

  const bodies: Record<NotificationTier, string> = {
    pre_10: 'Get ready — 1000 IU at 8:00 AM',
    pre_5: 'Almost time — 1000 IU at 8:00 AM',
    main: '1000 IU — scheduled for 8:00 AM',
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: titles[tier],
      subtitle: 'MediMates Reminder',
      body: bodies[tier],
      sound: 'default', // Required for banner display on iOS
      ...(isMain ? { badge: 1 } : {}),
      data: testData,
      categoryIdentifier: isMain ? 'MED_MAIN_REMINDER' : 'MED_PRE_REMINDER',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      repeats: false,
    },
  });
}
