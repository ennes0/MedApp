/**
 * Shared utility helpers
 */

import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
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
