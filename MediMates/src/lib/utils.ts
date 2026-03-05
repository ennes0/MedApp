/**
 * Shared utility helpers
 */

import { format, isToday, isTomorrow, isYesterday, addDays, addWeeks, addMonths } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import * as Crypto from 'expo-crypto';

// ──────────────────────────────────────────────
// ID generation
// ──────────────────────────────────────────────

export function generateId(): string {
  return Crypto.randomUUID();
}

// ──────────────────────────────────────────────
// Time formatting
// ──────────────────────────────────────────────

/** Format HH:mm to localized time string (e.g., "9:00 AM") */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h!, m!, 0, 0);
  return format(date, 'h:mm a');
}

/** Relative day label */
export function relativeDayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, MMM d');
}

/** Format date with timezone */
export function formatWithTz(date: Date, tz: string, fmt: string): string {
  return formatInTimeZone(date, tz, fmt);
}

/** Get current date string in user's timezone */
export function todayDateString(tz: string): string {
  const zoned = toZonedTime(new Date(), tz);
  return format(zoned, 'yyyy-MM-dd');
}

// ──────────────────────────────────────────────
// Greeting
// ──────────────────────────────────────────────

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ──────────────────────────────────────────────
// String helpers
// ──────────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 1)}…`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

// ──────────────────────────────────────────────
// Pair ID (deterministic, alphabetical)
// ──────────────────────────────────────────────

export function createPairId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

// ──────────────────────────────────────────────
// Treatment duration helpers
// ──────────────────────────────────────────────

import type { TreatmentDuration, Medication } from '@/src/types/firebase';

/**
 * Compute a concrete end date string (yyyy-MM-dd) from a treatment duration.
 * Returns undefined for 'ongoing' or if data is insufficient.
 */
export function computeTreatmentEndDate(
  duration: TreatmentDuration,
  startDate?: string,
): string | undefined {
  if (duration.type === 'ongoing') return undefined;
  if (duration.type === 'until_date') return duration.endDate;

  const base = startDate ? new Date(startDate) : new Date();
  const value = duration.value;
  if (!value || value <= 0) return undefined;

  let end: Date;
  switch (duration.type) {
    case 'specific_days':
      end = addDays(base, value);
      break;
    case 'specific_weeks':
      end = addWeeks(base, value);
      break;
    case 'specific_months':
      end = addMonths(base, value);
      break;
    default:
      return undefined;
  }

  return format(end, 'yyyy-MM-dd');
}

/**
 * Check whether a medication's treatment duration has expired.
 */
export function isTreatmentExpired(med: Medication): boolean {
  const d = med.treatmentDuration;
  if (!d || d.type === 'ongoing') return false;

  const endDate = d.endDate ?? computeTreatmentEndDate(
    d,
    med.schedule.startDate,
  );
  if (!endDate) return false;

  const today = format(new Date(), 'yyyy-MM-dd');
  return today > endDate;
}

/**
 * Get a human-readable label for when the treatment ends/ended.
 */
export function getTreatmentEndLabel(med: Medication): string | null {
  const d = med.treatmentDuration;
  if (!d || d.type === 'ongoing') return null;

  const endDate = d.endDate ?? computeTreatmentEndDate(
    d,
    med.schedule.startDate,
  );
  if (!endDate) return null;

  const today = format(new Date(), 'yyyy-MM-dd');
  if (today > endDate) {
    return `Treatment ended on ${endDate}`;
  }
  return `Treatment ends on ${endDate}`;
}
