/**
 * useTodayDoses — Computes scheduled doses merged with log status
 *
 * Reads user's meds + day log from Firestore.
 * Returns sorted list of ScheduledDose (timezone-aware).
 */

import { useMemo } from 'react';
import {
  collection,
  doc,
  query,
  orderBy,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInCalendarDays, addDays, addWeeks, addMonths } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { db } from '@/src/lib/firebase';
import { useFirestoreQuery, useFirestoreDoc } from '@/src/lib/firestore-hooks';
import { useAuthStore } from '@/src/stores/auth-store';
import type {
  Medication,
  DayLog,
  DoseLogEntry,
  ScheduledDose,
  DoseStatus,
} from '@/src/types/firebase';

/**
 * Get date string in user timezone
 */
function getDateString(date: Date, tz: string): string {
  const zoned = toZonedTime(date, tz);
  return format(zoned, 'yyyy-MM-dd');
}

/**
 * Check if a medication has started yet (respects startDate)
 */
function hasMedStarted(med: Medication, dateStr: string): boolean {
  const startDate = med.schedule.startDate;
  if (!startDate) return true; // no start date → always started
  return dateStr >= startDate;
}

/**
 * Check if a medication's treatment duration has expired
 */
function hasMedExpired(med: Medication, dateStr: string): boolean {
  const duration = med.treatmentDuration;
  if (!duration) return false; // no duration → never expires
  if (duration.type === 'ongoing') return false;

  const startDate = med.schedule.startDate
    ? new Date(med.schedule.startDate)
    : med.createdAt?.toDate?.() ?? new Date();

  const target = new Date(dateStr);

  switch (duration.type) {
    case 'until_date':
      return duration.endDate ? dateStr > duration.endDate : false;
    case 'specific_days':
      if (!duration.value) return false;
      return differenceInCalendarDays(target, startDate) >= duration.value;
    case 'specific_weeks':
      if (!duration.value) return false;
      return differenceInCalendarDays(target, startDate) >= duration.value * 7;
    case 'specific_months': {
      if (!duration.value) return false;
      const endDate = addMonths(startDate, duration.value);
      return target >= endDate;
    }
    default:
      return false;
  }
}

/**
 * Check if a medication is scheduled for a given day.
 * Handles all 8 frequency types + startDate + treatmentDuration.
 */
function isMedScheduledForDay(
  med: Medication,
  dayOfWeek: number,
  dateStr: string,
): boolean {
  if (med.paused) return false;

  // Check if med has started
  if (!hasMedStarted(med, dateStr)) return false;

  // Check if med has expired
  if (hasMedExpired(med, dateStr)) return false;

  const { frequency } = med.schedule;

  switch (frequency) {
    case 'daily':
      return true;

    case 'as_needed':
      return false;

    case 'specific_days': {
      const days = med.schedule.days ?? med.schedule.daysOfWeek ?? [];
      return days.includes(dayOfWeek);
    }

    case 'every_x_hours':
    case 'x_times_daily':
      // These show every day
      return true;

    case 'weekly': {
      // Check daysOfWeek (e.g. only Monday)
      const days = med.schedule.daysOfWeek ?? med.schedule.days ?? [];
      return days.includes(dayOfWeek);
    }

    case 'monthly': {
      // Check dayOfMonth
      const dom = med.schedule.dayOfMonth ?? 1;
      const targetDay = new Date(dateStr).getDate();
      return targetDay === dom;
    }

    case 'cyclical': {
      // Calculate if current date is in "on" or "off" period
      const cycleDaysOn = med.schedule.cycleDaysOn ?? 21;
      const cycleDaysOff = med.schedule.cycleDaysOff ?? 7;
      const cycleLength = cycleDaysOn + cycleDaysOff;

      const startDate = med.schedule.startDate
        ? new Date(med.schedule.startDate)
        : med.createdAt?.toDate?.() ?? new Date();

      const target = new Date(dateStr);
      const daysSinceStart = differenceInCalendarDays(target, startDate);
      if (daysSinceStart < 0) return false;

      const dayInCycle = daysSinceStart % cycleLength;
      return dayInCycle < cycleDaysOn; // "on" period
    }

    default:
      return true;
  }
}

/**
 * Generate time slots for a medication based on its schedule.
 * Handles all frequency types including x_times_daily, weekly, monthly, cyclical.
 */
function getTimeSlotsForMed(med: Medication): string[] {
  const { frequency, times, intervalHours, timesPerDay } = med.schedule;

  if (frequency === 'as_needed') return [];

  if (frequency === 'every_x_hours' && intervalHours && intervalHours > 0) {
    // If user has explicit times, respect them
    if (times && times.length > 0) return times;

    // Otherwise, generate time slots based on interval starting from 08:00
    const generated: string[] = [];
    const startHour = 8;
    const endHour = 22;
    for (let h = startHour; h <= endHour; h += intervalHours) {
      const hh = String(Math.floor(h)).padStart(2, '0');
      const mm = String(Math.round((h % 1) * 60)).padStart(2, '0');
      generated.push(`${hh}:${mm}`);
    }
    return generated;
  }

  if (frequency === 'x_times_daily') {
    // Use explicit times if set; otherwise generate evenly spaced
    if (times && times.length > 0) return times;
    const count = timesPerDay ?? 2;
    const generated: string[] = [];
    const startHour = 7;
    const endHour = 22;
    const span = endHour - startHour;
    const interval = span / count;
    for (let i = 0; i < count; i++) {
      const h = Math.round(startHour + i * interval);
      generated.push(`${String(h).padStart(2, '0')}:00`);
    }
    return generated;
  }

  // daily / specific_days / weekly / monthly / cyclical: use explicit times
  return times ?? [];
}

export function useTodayDoses(selectedDate?: Date) {
  const user = useAuthStore((s) => s.user);
  const tz = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const targetDate = selectedDate ?? new Date();
  const dateStr = getDateString(targetDate, tz);
  const dayOfWeek = toZonedTime(targetDate, tz).getDay(); // 0=Sun

  // 1. Fetch all meds
  const medsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(db, 'userMeds', user.uid, 'items'),
      orderBy('createdAt', 'desc'),
    );
  }, [user]);

  const { data: meds, isLoading: medsLoading } = useFirestoreQuery<Medication>({
    queryKey: ['meds', user?.uid],
    firestoreQuery: medsQuery,
    enabled: !!user,
  });

  // 2. Fetch today's log document
  const logRef = useMemo(() => {
    if (!user) return null;
    return doc(db, 'userMeds', user.uid, 'dayLogs', dateStr);
  }, [user, dateStr]);

  const { data: dayLog, isLoading: logLoading } = useFirestoreDoc<DayLog>({
    queryKey: ['dayLog', user?.uid, dateStr],
    docRef: logRef,
    enabled: !!user,
  });

  // 3. Merge meds + log → ScheduledDose[]
  const doses: ScheduledDose[] = useMemo(() => {
    if (!meds || meds.length === 0) return [];

    const logEntries = dayLog?.entries ?? [];

    const result: ScheduledDose[] = [];

    for (const med of meds) {
      if (!isMedScheduledForDay(med, dayOfWeek, dateStr)) continue;

      const timeSlots = getTimeSlotsForMed(med);

      for (const time of timeSlots) {
        // Find matching log entry
        const entry = logEntries.find(
          (e) => e.medId === med.id && e.scheduledTime === time,
        );

        result.push({
          medId: med.id,
          medName: med.name,
          medColor: med.color,
          dosage: med.dosage,
          unit: med.unit,
          scheduledTime: time,
          status: entry?.status ?? 'pending',
          loggedAt: entry?.loggedAt?.toDate?.() ?? null,
        });
      }
    }

    // Sort by scheduled time
    result.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    return result;
  }, [meds, dayLog, dayOfWeek]);

  const takenCount = doses.filter((d) => d.status === 'taken').length;
  const totalCount = doses.length;
  const adherence = totalCount > 0 ? takenCount / totalCount : 0;
  const nextDose = doses.find((d) => d.status === 'pending') ?? null;
  const upcomingDoses = doses.filter(
    (d) => d.status === 'pending' && d !== nextDose,
  );

  return {
    doses,
    nextDose,
    upcomingDoses,
    takenCount,
    totalCount,
    adherence,
    isLoading: medsLoading || logLoading,
    dateStr,
  };
}

/**
 * useLogDose — mutation to write/update a dose entry in today's log
 */
export function useLogDose() {
  const user = useAuthStore((s) => s.user);
  const tz = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dose,
      status,
      note,
      date,
    }: {
      dose: ScheduledDose;
      status: DoseStatus;
      note?: string;
      date?: Date;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const targetDate = date ?? new Date();
      const dateStr = getDateString(targetDate, tz);
      const logDocRef = doc(db, 'userMeds', user.uid, 'dayLogs', dateStr);

      // Read current log and merge (or create)
      const { getDoc } = await import('firebase/firestore');
      const snap = await getDoc(logDocRef);
      const existingEntries: DoseLogEntry[] = snap.exists()
        ? (snap.data()?.entries ?? [])
        : [];

      // Update or add the entry
      const entryIndex = existingEntries.findIndex(
        (e) => e.medId === dose.medId && e.scheduledTime === dose.scheduledTime,
      );

      const newEntry: DoseLogEntry = {
        medId: dose.medId,
        medName: dose.medName,
        scheduledTime: dose.scheduledTime,
        status,
        loggedAt: status === 'pending' ? null : Timestamp.now(),
        note: note ?? '',
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
      return logData;
    },
    onSuccess: (_, variables) => {
      const targetDate = variables.date ?? new Date();
      const dateStr = getDateString(targetDate, tz);
      queryClient.invalidateQueries({ queryKey: ['dayLog', user?.uid, dateStr] });
    },
  });
}
