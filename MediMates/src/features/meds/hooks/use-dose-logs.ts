/**
 * useDoseLogs — Historical dose log analytics hook
 *
 * Fetches dayLogs for a configurable period (7/14/30 days) and computes
 * detailed per-medication analytics: adherence %, streaks, taken/skipped/missed
 * counts, time-of-day patterns, and overall trends.
 */

import { useMemo, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  format,
  subDays,
  eachDayOfInterval,
  startOfDay,
  differenceInCalendarDays,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { db } from '@/src/lib/firebase';
import { useAuthStore } from '@/src/stores/auth-store';
import { useMeds } from './use-meds';
import type {
  Medication,
  DayLog,
  DoseLogEntry,
  DoseStatus,
} from '@/src/types/firebase';

/* ── Types ── */

export type AnalyticsPeriod = 7 | 14 | 30;

export interface MedAnalytics {
  medId: string;
  medName: string;
  medColor: string;
  /** Adherence % over the period (0–100) */
  adherencePct: number;
  /** Total scheduled doses in the period */
  totalScheduled: number;
  /** Doses taken */
  takenCount: number;
  /** Doses explicitly skipped */
  skippedCount: number;
  /** Doses missed (scheduled but not logged as taken or skipped) */
  missedCount: number;
  /** Doses snoozed */
  snoozedCount: number;
  /** Current consecutive days with ≥1 taken dose for this med */
  currentStreak: number;
  /** Best consecutive day streak for this med */
  bestStreak: number;
  /** Last time this med was taken (ISO string or null) */
  lastTakenDate: string | null;
  /** Per-time-slot adherence: { "08:00": { taken: 5, total: 7 }, … } */
  timeSlotStats: Record<string, { taken: number; total: number; skipped: number }>;
  /** Daily adherence trend: [{ date, pct, taken, total }] */
  dailyTrend: DailyTrendPoint[];
}

export interface DailyTrendPoint {
  date: string; // yyyy-MM-dd
  label: string; // short label like "Mon"
  pct: number;
  taken: number;
  total: number;
  skipped: number;
  missed: number;
}

export interface OverallAnalytics {
  /** Overall adherence % across all meds for the period */
  overallAdherencePct: number;
  /** Total taken across all meds */
  totalTaken: number;
  /** Total scheduled across all meds */
  totalScheduled: number;
  /** Total skipped */
  totalSkipped: number;
  /** Total missed */
  totalMissed: number;
  /** Current streak of days with 100% adherence */
  currentPerfectStreak: number;
  /** Best streak of days with 100% adherence */
  bestPerfectStreak: number;
  /** Current streak of days with any dose taken */
  currentActiveStreak: number;
  /** Daily overall adherence trend */
  dailyTrend: DailyTrendPoint[];
  /** Time-of-day pattern: morning (5-12), afternoon (12-17), evening (17-24), night (0-5) */
  timeOfDayPattern: {
    morning: { taken: number; total: number; pct: number };
    afternoon: { taken: number; total: number; pct: number };
    evening: { taken: number; total: number; pct: number };
    night: { taken: number; total: number; pct: number };
  };
  /** Per-medication analytics */
  perMed: MedAnalytics[];
  /** Status distribution */
  statusDistribution: {
    taken: number;
    skipped: number;
    missed: number;
    snoozed: number;
  };
}

/* ── Helpers ── */

function getTimeOfDay(time: string): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = parseInt(time.split(':')[0]!, 10);
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 24) return 'evening';
  return 'night';
}

function computeStreaks(dailyResults: boolean[]): { current: number; best: number } {
  let current = 0;
  let best = 0;
  let running = 0;

  for (let i = 0; i < dailyResults.length; i++) {
    if (dailyResults[i]) {
      running++;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }

  // Current streak counts from the latest day backward
  for (let i = dailyResults.length - 1; i >= 0; i--) {
    if (dailyResults[i]) {
      current++;
    } else {
      break;
    }
  }

  return { current, best };
}

/**
 * Check if a medication was scheduled for a specific date.
 * Simplified version for analytics — mirrors use-today-doses logic.
 */
function isMedScheduledForDate(med: Medication, dateStr: string): boolean {
  if (med.paused) return false;

  const startDate = med.schedule.startDate;
  if (startDate && dateStr < startDate) return false;

  // Check treatment duration expiry
  const duration = med.treatmentDuration;
  if (duration && duration.type !== 'ongoing') {
    const medStart = med.schedule.startDate
      ? new Date(med.schedule.startDate)
      : med.createdAt?.toDate?.() ?? new Date();
    const target = new Date(dateStr);
    const daysDiff = differenceInCalendarDays(target, medStart);

    switch (duration.type) {
      case 'until_date':
        if (duration.endDate && dateStr > duration.endDate) return false;
        break;
      case 'specific_days':
        if (duration.value && daysDiff >= duration.value) return false;
        break;
      case 'specific_weeks':
        if (duration.value && daysDiff >= duration.value * 7) return false;
        break;
      case 'specific_months':
        if (duration.value && daysDiff >= duration.value * 30) return false;
        break;
    }
  }

  const { frequency } = med.schedule;
  const targetDate = new Date(dateStr);
  const dayOfWeek = targetDate.getDay();

  switch (frequency) {
    case 'daily':
    case 'every_x_hours':
    case 'x_times_daily':
      return true;
    case 'as_needed':
      return false;
    case 'specific_days':
    case 'weekly': {
      const days = med.schedule.days ?? med.schedule.daysOfWeek ?? [];
      return days.includes(dayOfWeek);
    }
    case 'monthly': {
      const dom = med.schedule.dayOfMonth ?? 1;
      return targetDate.getDate() === dom;
    }
    case 'cyclical': {
      const cycleDaysOn = med.schedule.cycleDaysOn ?? 21;
      const cycleDaysOff = med.schedule.cycleDaysOff ?? 7;
      const cycleLength = cycleDaysOn + cycleDaysOff;
      const medStart = med.schedule.startDate
        ? new Date(med.schedule.startDate)
        : med.createdAt?.toDate?.() ?? new Date();
      const daysSinceStart = differenceInCalendarDays(targetDate, medStart);
      if (daysSinceStart < 0) return false;
      return (daysSinceStart % cycleLength) < cycleDaysOn;
    }
    default:
      return true;
  }
}

function getTimeSlotsForMed(med: Medication): string[] {
  const { frequency, times, intervalHours, timesPerDay } = med.schedule;
  if (frequency === 'as_needed') return [];

  if (frequency === 'every_x_hours' && intervalHours && intervalHours > 0) {
    if (times && times.length > 0) return times;
    const generated: string[] = [];
    for (let h = 8; h <= 22; h += intervalHours) {
      generated.push(`${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`);
    }
    return generated;
  }

  if (frequency === 'x_times_daily') {
    if (times && times.length > 0) return times;
    const count = timesPerDay ?? 2;
    const generated: string[] = [];
    const interval = 15 / count;
    for (let i = 0; i < count; i++) {
      const h = Math.round(7 + i * interval);
      generated.push(`${String(h).padStart(2, '0')}:00`);
    }
    return generated;
  }

  return times ?? [];
}

/* ── Main Hook ── */

export function useDoseLogs(period: AnalyticsPeriod = 7) {
  const user = useAuthStore((s) => s.user);
  const tz = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data: meds = [] } = useMeds();

  const today = startOfDay(toZonedTime(new Date(), tz));
  const startDate = subDays(today, period - 1);
  const dates = eachDayOfInterval({ start: startDate, end: today });
  const dateStrings = dates.map((d) => format(d, 'yyyy-MM-dd'));

  // Fetch all dayLogs for the period
  const {
    data: doseLogs,
    isLoading,
  } = useQuery<Record<string, DayLog>>({
    queryKey: ['doseLogs', user?.uid, period],
    queryFn: async () => {
      if (!user) return {};

      const logsRef = collection(db, 'userMeds', user.uid, 'dayLogs');
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(today, 'yyyy-MM-dd');

      const q = query(
        logsRef,
        where('date', '>=', startStr),
        where('date', '<=', endStr),
        orderBy('date', 'asc'),
      );

      const snapshot = await getDocs(q);
      const result: Record<string, DayLog> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as DayLog;
        result[data.date] = data;
      });
      return result;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Compute analytics
  const analytics: OverallAnalytics = useMemo(() => {
    const logs = doseLogs ?? {};
    const activeMeds = meds.filter((m) => !m.paused);

    // Initialize per-med accumulators
    const medAccMap = new Map<string, {
      med: Medication;
      taken: number;
      skipped: number;
      missed: number;
      snoozed: number;
      total: number;
      dailyTaken: boolean[]; // per-day: was at least 1 dose taken?
      dailyTrend: DailyTrendPoint[];
      timeSlotStats: Record<string, { taken: number; total: number; skipped: number }>;
      lastTakenDate: string | null;
    }>();

    for (const med of activeMeds) {
      medAccMap.set(med.id, {
        med,
        taken: 0,
        skipped: 0,
        missed: 0,
        snoozed: 0,
        total: 0,
        dailyTaken: [],
        dailyTrend: [],
        timeSlotStats: {},
        lastTakenDate: null,
      });
    }

    // Overall accumulators
    let totalTaken = 0;
    let totalScheduled = 0;
    let totalSkipped = 0;
    let totalMissed = 0;
    let totalSnoozed = 0;

    const overallDailyTrend: DailyTrendPoint[] = [];
    const dailyPerfect: boolean[] = []; // was each day 100%?
    const dailyActive: boolean[] = []; // was any dose taken each day?

    const timeOfDay = {
      morning: { taken: 0, total: 0 },
      afternoon: { taken: 0, total: 0 },
      evening: { taken: 0, total: 0 },
      night: { taken: 0, total: 0 },
    };

    // Iterate each day in this period
    for (let i = 0; i < dateStrings.length; i++) {
      const dateStr = dateStrings[i]!;
      const dayLog = logs[dateStr];
      const dayEntries = dayLog?.entries ?? [];

      let dayTotalAll = 0;
      let dayTakenAll = 0;
      let daySkippedAll = 0;
      let dayMissedAll = 0;

      for (const med of activeMeds) {
        const acc = medAccMap.get(med.id)!;
        if (!isMedScheduledForDate(med, dateStr)) {
          acc.dailyTaken.push(false);
          acc.dailyTrend.push({
            date: dateStr,
            label: format(dates[i]!, 'EEE'),
            pct: -1, // not scheduled
            taken: 0,
            total: 0,
            skipped: 0,
            missed: 0,
          });
          continue;
        }

        const timeSlots = getTimeSlotsForMed(med);
        let medDayTaken = 0;
        let medDaySkipped = 0;
        let medDayMissed = 0;
        let medDaySnoozed = 0;

        for (const time of timeSlots) {
          const entry = dayEntries.find(
            (e) => e.medId === med.id && e.scheduledTime === time,
          );

          const status: DoseStatus = entry?.status ?? 'pending';
          const tod = getTimeOfDay(time);
          timeOfDay[tod].total++;

          // Init time slot stats
          if (!acc.timeSlotStats[time]) {
            acc.timeSlotStats[time] = { taken: 0, total: 0, skipped: 0 };
          }
          acc.timeSlotStats[time]!.total++;

          if (status === 'taken') {
            medDayTaken++;
            timeOfDay[tod].taken++;
            acc.timeSlotStats[time]!.taken++;
            // Track last taken
            if (!acc.lastTakenDate || dateStr > acc.lastTakenDate) {
              acc.lastTakenDate = dateStr;
            }
          } else if (status === 'skipped') {
            medDaySkipped++;
            acc.timeSlotStats[time]!.skipped++;
          } else if (status === 'snoozed') {
            medDaySnoozed++;
          } else {
            // pending = missed (past days)
            medDayMissed++;
          }
        }

        const medDayTotal = timeSlots.length;
        acc.taken += medDayTaken;
        acc.skipped += medDaySkipped;
        acc.missed += medDayMissed;
        acc.snoozed += medDaySnoozed;
        acc.total += medDayTotal;
        acc.dailyTaken.push(medDayTaken > 0);

        const medDayPct = medDayTotal > 0
          ? Math.round((medDayTaken / medDayTotal) * 100)
          : 0;

        acc.dailyTrend.push({
          date: dateStr,
          label: format(dates[i]!, 'EEE'),
          pct: medDayPct,
          taken: medDayTaken,
          total: medDayTotal,
          skipped: medDaySkipped,
          missed: medDayMissed,
        });

        dayTotalAll += medDayTotal;
        dayTakenAll += medDayTaken;
        daySkippedAll += medDaySkipped;
        dayMissedAll += medDayMissed;
      }

      totalTaken += dayTakenAll;
      totalScheduled += dayTotalAll;
      totalSkipped += daySkippedAll;
      totalMissed += dayMissedAll;

      const dayPct = dayTotalAll > 0
        ? Math.round((dayTakenAll / dayTotalAll) * 100)
        : 0;

      overallDailyTrend.push({
        date: dateStr,
        label: format(dates[i]!, 'EEE'),
        pct: dayPct,
        taken: dayTakenAll,
        total: dayTotalAll,
        skipped: daySkippedAll,
        missed: dayMissedAll,
      });

      dailyPerfect.push(dayTotalAll > 0 && dayTakenAll === dayTotalAll);
      dailyActive.push(dayTakenAll > 0);
    }

    // Compute streaks
    const perfectStreaks = computeStreaks(dailyPerfect);
    const activeStreaks = computeStreaks(dailyActive);

    // Build per-med analytics
    const perMed: MedAnalytics[] = [];
    for (const [medId, acc] of medAccMap) {
      const streaks = computeStreaks(acc.dailyTaken);
      perMed.push({
        medId,
        medName: acc.med.name,
        medColor: acc.med.color,
        adherencePct: acc.total > 0 ? Math.round((acc.taken / acc.total) * 100) : 0,
        totalScheduled: acc.total,
        takenCount: acc.taken,
        skippedCount: acc.skipped,
        missedCount: acc.missed,
        snoozedCount: acc.snoozed,
        currentStreak: streaks.current,
        bestStreak: streaks.best,
        lastTakenDate: acc.lastTakenDate,
        timeSlotStats: acc.timeSlotStats,
        dailyTrend: acc.dailyTrend,
      });
    }

    // Sort by adherence descending
    perMed.sort((a, b) => b.adherencePct - a.adherencePct);

    const overallAdherencePct = totalScheduled > 0
      ? Math.round((totalTaken / totalScheduled) * 100)
      : 0;

    return {
      overallAdherencePct,
      totalTaken,
      totalScheduled,
      totalSkipped,
      totalMissed,
      currentPerfectStreak: perfectStreaks.current,
      bestPerfectStreak: perfectStreaks.best,
      currentActiveStreak: activeStreaks.current,
      dailyTrend: overallDailyTrend,
      timeOfDayPattern: {
        morning: {
          ...timeOfDay.morning,
          pct: timeOfDay.morning.total > 0
            ? Math.round((timeOfDay.morning.taken / timeOfDay.morning.total) * 100)
            : 0,
        },
        afternoon: {
          ...timeOfDay.afternoon,
          pct: timeOfDay.afternoon.total > 0
            ? Math.round((timeOfDay.afternoon.taken / timeOfDay.afternoon.total) * 100)
            : 0,
        },
        evening: {
          ...timeOfDay.evening,
          pct: timeOfDay.evening.total > 0
            ? Math.round((timeOfDay.evening.taken / timeOfDay.evening.total) * 100)
            : 0,
        },
        night: {
          ...timeOfDay.night,
          pct: timeOfDay.night.total > 0
            ? Math.round((timeOfDay.night.taken / timeOfDay.night.total) * 100)
            : 0,
        },
      },
      perMed,
      statusDistribution: {
        taken: totalTaken,
        skipped: totalSkipped,
        missed: totalMissed,
        snoozed: totalSnoozed,
      },
    };
  }, [doseLogs, meds, dateStrings, dates]);

  // Also expose the raw doseLogs map for PDF export
  const doseLogsMap = useMemo(() => doseLogs ?? {}, [doseLogs]);

  return {
    analytics,
    doseLogs: doseLogsMap,
    isLoading,
    period,
    dateStrings,
  };
}
