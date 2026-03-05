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
  nickname: string; // Takma ad — public-facing alias, no real names
  email: string | null;
  photoURL: string | null;
  bio: string;
  timezone: string;
  socialOptIn: boolean;
  socialVisible: boolean;
  onboardingComplete: boolean;
  pro: ProEntitlement;
  badges: UserBadge[];
  mateCount: number; // Number of matched mates
  memberSince: Timestamp; // When user joined (for "X aydır kullanıyor")
  suspended: boolean;
  suspendedAt: Timestamp | null;
  blockList: string[]; // UIDs this user has blocked
  expoPushToken: string | null; // Expo push token for remote notifications
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ──────────────────────────────────────────────
// Badges
// ──────────────────────────────────────────────

export type BadgeType =
  | 'newcomer'       // Yeni üye
  | 'experienced'    // Tecrübeli (3+ ay)
  | 'veteran'        // Kıdemli (1+ yıl)
  | 'supporter'      // Destekçi (first to message 10+ mates)
  | 'reliable'       // Güvenilir (no reports, active 30+ days)
  | 'helpful'        // Yardımsever (received 5+ positive feedback)
  | 'early_adopter'  // Erken Kullanıcı
  | 'pro_member';    // Pro Üye

export interface UserBadge {
  type: BadgeType;
  earnedAt: Timestamp;
}

export const BADGE_META: Record<BadgeType, { label: string; labelTr: string; icon: string; color: string; description: string }> = {
  newcomer:      { label: 'Newcomer',      labelTr: 'Newcomer',          icon: 'star.fill',                color: '#5AC8FA', description: 'Just joined the community' },
  experienced:   { label: 'Experienced',   labelTr: 'Experienced',       icon: 'clock.badge.checkmark.fill', color: '#FF9F0A', description: 'Active user for 3+ months' },
  veteran:       { label: 'Veteran',       labelTr: 'Veteran',           icon: 'shield.checkered',          color: '#AF52DE', description: 'Active user for 1+ years' },
  supporter:     { label: 'Supporter',     labelTr: 'Supporter',         icon: 'heart.fill',                color: '#FF2D55', description: 'Contacted 10+ mates' },
  reliable:      { label: 'Reliable',      labelTr: 'Reliable',          icon: 'checkmark.shield.fill',     color: '#34C759', description: 'No reports received, active 30+ days' },
  helpful:       { label: 'Helpful',       labelTr: 'Helpful',           icon: 'hand.thumbsup.fill',        color: '#007AFF', description: 'Received 5+ positive feedback' },
  early_adopter: { label: 'Early Adopter', labelTr: 'Early Adopter',     icon: 'sparkles',                  color: '#FFD60A', description: 'One of the first users' },
  pro_member:    { label: 'Pro Member',    labelTr: 'Pro Member',        icon: 'crown.fill',                color: '#FF9500', description: 'MediMates Pro subscriber' },
};

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

export type ReportReason =
  | 'medical_advice'       // Tıbbi tavsiye veriyor
  | 'harassment'           // Taciz
  | 'spam'                 // Spam
  | 'inappropriate'        // Uygunsuz içerik
  | 'fake_profile'         // Sahte profil
  | 'dangerous_info'       // Tehlikeli bilgi paylaşımı
  | 'other';               // Diğer

export interface ReportDoc {
  id: string;
  reporterId: string;
  reportedUid: string;
  reason: ReportReason;
  reasonDetail: string; // Free-text explanation
  chatId?: string;
  messageId?: string;
  messageText?: string; // Snapshot of the reported message
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  createdAt: Timestamp;
}

// ──────────────────────────────────────────────
// Blocked Users
// ──────────────────────────────────────────────

export interface BlockDoc {
  id: string;
  blockerUid: string;
  blockedUid: string;
  createdAt: Timestamp;
}

// ──────────────────────────────────────────────
// Content Moderation
// ──────────────────────────────────────────────

export type ModerationAction = 'warn' | 'flag' | 'block_message' | 'suspend';

export interface ModerationLogDoc {
  id: string;
  targetUid: string;
  action: ModerationAction;
  reason: string;
  triggeredBy: 'auto' | 'manual' | 'report';
  messageId?: string;
  chatId?: string;
  createdAt: Timestamp;
}

// ──────────────────────────────────────────────
// Chat Consent / Disclaimer Acceptance
// ──────────────────────────────────────────────

export interface ChatConsentDoc {
  uid: string;
  acceptedAt: Timestamp;
  version: string; // Disclaimer version user accepted
}

// ──────────────────────────────────────────────
// Computed / UI types
// ──────────────────────────────────────────────

export interface ScheduledDose {
  medId: string;
  medName: string;
  medColor: string;
  medForm?: MedicationForm;
  dosage: string;
  unit: string;
  scheduledTime: string;
  status: DoseStatus;
  loggedAt: Date | null;
}

export interface DiscoverProfile {
  uid: string;
  displayName: string;
  nickname: string;
  avatarUrl: string | null;
  age: number;
  visibleMeds: string[];
  bio: string;
  badges: UserBadge[];
  mateCount: number;
  memberSince: Timestamp;
}
