/**
 * Firebase types — Firestore document shapes
 */

import { Timestamp } from 'firebase/firestore';

// ──────────────────────────────────────────────
// User
// ──────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  bio: string;
  timezone: string;
  socialOptIn: boolean;
  socialVisible: boolean;
  onboardingComplete: boolean;
  pro: ProEntitlement;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProEntitlement {
  active: boolean;
  plan: 'monthly' | 'yearly' | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  expiresAt: Timestamp | null;
}

// ──────────────────────────────────────────────
// Medications
// ──────────────────────────────────────────────

export type FrequencyType =
  | 'daily'
  | 'specific_days'
  | 'every_x_hours'
  | 'x_times_daily'
  | 'weekly'
  | 'monthly'
  | 'cyclical'
  | 'as_needed';

export type MedicationForm =
  | 'tablet'
  | 'capsule'
  | 'liquid'
  | 'injection'
  | 'inhaler'
  | 'patch'
  | 'cream'
  | 'drops'
  | 'suppository'
  | 'spray'
  | 'powder'
  | 'lozenge';

export type RouteOfAdministration =
  | 'oral'
  | 'sublingual'
  | 'topical'
  | 'inhaled'
  | 'subcutaneous'
  | 'intramuscular'
  | 'intravenous'
  | 'rectal'
  | 'nasal'
  | 'optic'
  | 'otic'
  | 'transdermal';

export type MealRelation =
  | 'no_restriction'
  | 'before_meal'
  | 'with_meal'
  | 'after_meal'
  | 'empty_stomach';

export type TreatmentDurationType =
  | 'ongoing'
  | 'specific_days'
  | 'specific_weeks'
  | 'specific_months'
  | 'until_date';

export interface MedSchedule {
  frequency: FrequencyType;
  times: string[]; // HH:mm format
  days?: number[]; // 0=Sun..6=Sat (for specific_days)
  daysOfWeek?: number[]; // alias for days, used by notification service
  intervalHours?: number; // for every_x_hours
  timesPerDay?: number; // for x_times_daily
  dayOfMonth?: number; // for monthly
  cycleDaysOn?: number; // for cyclical (e.g. 21 days on)
  cycleDaysOff?: number; // for cyclical (e.g. 7 days off)
  startDate?: string; // yyyy-MM-dd
}

export interface TreatmentDuration {
  type: TreatmentDurationType;
  value?: number; // number of days/weeks/months
  endDate?: string; // yyyy-MM-dd (for until_date)
}

export interface RefillTracking {
  enabled: boolean;
  currentStock?: number; // current number of doses remaining
  refillAt?: number; // remind when stock reaches this
  pillsPerRefill?: number; // how many per refill
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  unit: string;
  form?: MedicationForm;
  route?: RouteOfAdministration;
  doseQuantity?: number; // e.g. 2 tablets per dose
  color: string;
  icon: string;
  schedule: MedSchedule;
  mealRelation?: MealRelation;
  treatmentDuration?: TreatmentDuration;
  refill?: RefillTracking;
  reminderEnabled: boolean;
  reminderMinutesBefore?: number; // 0 = at time, 5, 10, 15, 30
  paused: boolean;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ──────────────────────────────────────────────
// Dose Logs
// ──────────────────────────────────────────────

export type DoseStatus = 'taken' | 'skipped' | 'snoozed' | 'pending';

export interface DoseLogEntry {
  medId: string;
  medName: string;
  scheduledTime: string; // HH:mm
  status: DoseStatus;
  loggedAt: Timestamp | null;
  note: string;
}

export interface DayLog {
  date: string; // yyyy-MM-dd
  entries: DoseLogEntry[];
  updatedAt: Timestamp;
}

// ──────────────────────────────────────────────
// Social — Likes / Pairs
// ──────────────────────────────────────────────

export interface LikeDoc {
  id: string;
  fromUid: string;
  toUid: string;
  createdAt: Timestamp;
}

export interface PairDoc {
  id: string;
  uids: [string, string];
  chatId: string;
  createdAt: Timestamp;
  lastMessageAt: Timestamp | null;
}

// ──────────────────────────────────────────────
// Med Matching — 1-to-1 per medication
// ──────────────────────────────────────────────

export type MedMatchStatus = 'searching' | 'matched' | 'expired';

export interface MedMatchDoc {
  id: string;
  /** Both user UIDs (sorted alphabetically) */
  uids: [string, string];
  /** Who initiated the match search */
  initiatorUid: string;
  /** Shared medication name (lowercase, trimmed for comparison) */
  medNameKey: string;
  /** Display-friendly medication name */
  medDisplayName: string;
  /** Medication form icon (e.g. tablet, capsule) */
  medForm: MedicationForm | null;
  /** Medication color from the initiator's med */
  medColor: string;
  /** Mate profile snapshot (the other user) */
  mateProfiles: Record<
    string,
    {
      displayName: string;
      photoURL: string | null;
      bio: string;
    }
  >;
  /** Match status */
  status: MedMatchStatus;
  createdAt: Timestamp;
  lastMessageAt: Timestamp | null;
}

// ──────────────────────────────────────────────
// Chat
// ──────────────────────────────────────────────

export interface ChatDoc {
  id: string;
  members: [string, string];
  memberProfiles: Record<
    string,
    { displayName: string; photoURL: string | null }
  >;
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MessageDoc {
  id: string;
  pairId: string;
  senderUid: string;
  text: string;
  createdAt: Timestamp;
  readBy: string[];
}

// ──────────────────────────────────────────────
// Reports
// ──────────────────────────────────────────────

export interface ReportDoc {
  id: string;
  reporterId: string;
  reportedUid: string;
  reason: string;
  chatId?: string;
  messageId?: string;
  createdAt: Timestamp;
}

// ──────────────────────────────────────────────
// Computed / UI types
// ──────────────────────────────────────────────

export interface ScheduledDose {
  medId: string;
  medName: string;
  medColor: string;
  dosage: string;
  unit: string;
  scheduledTime: string;
  status: DoseStatus;
  loggedAt: Date | null;
}

export interface DiscoverProfile {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  age: number;
  visibleMeds: string[];
  bio: string;
}
