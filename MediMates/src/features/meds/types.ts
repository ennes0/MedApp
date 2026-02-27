/**
 * Meds types — Enhanced medication specification constants & schemas
 *
 * Based on pharmaceutical standards:
 * - USP (United States Pharmacopeia) dosage forms
 * - FDA route of administration classifications
 * - Common medication scheduling patterns (incl. cyclical for OCP, steroids)
 * - Refill tracking for adherence monitoring
 */

import type {
  Medication, MedSchedule, FrequencyType, MedicationForm,
  RouteOfAdministration, MealRelation, TreatmentDurationType,
  TreatmentDuration, RefillTracking,
} from '@/src/types/firebase';
import { z } from 'zod';

// ──────────────────────────────────────────────
// Medication Form — USP Categories
// ──────────────────────────────────────────────

export interface MedFormOption {
  id: MedicationForm;
  label: string;
  icon: string; // SF Symbol name
  description: string;
}

export const MEDICATION_FORMS: MedFormOption[] = [
  { id: 'tablet', label: 'Tablet', icon: 'pills.fill', description: 'Solid pressed pill' },
  { id: 'capsule', label: 'Capsule', icon: 'capsule.fill', description: 'Gelatin shell with powder/liquid' },
  { id: 'liquid', label: 'Liquid', icon: 'drop.fill', description: 'Oral solution or suspension' },
  { id: 'injection', label: 'Injection', icon: 'syringe.fill', description: 'Syringe or pen injector' },
  { id: 'inhaler', label: 'Inhaler', icon: 'wind', description: 'Metered-dose or dry powder' },
  { id: 'patch', label: 'Patch', icon: 'bandage.fill', description: 'Transdermal adhesive' },
  { id: 'cream', label: 'Cream / Gel', icon: 'hand.raised.fill', description: 'Topical ointment or gel' },
  { id: 'drops', label: 'Drops', icon: 'eyedropper.halffull', description: 'Eye, ear, or nose drops' },
  { id: 'suppository', label: 'Suppository', icon: 'pill.fill', description: 'Rectal or vaginal insert' },
  { id: 'spray', label: 'Spray', icon: 'aqi.medium', description: 'Nasal or oral spray' },
  { id: 'powder', label: 'Powder', icon: 'sparkles', description: 'Dissolve or mix before use' },
  { id: 'lozenge', label: 'Lozenge', icon: 'circle.fill', description: 'Dissolve slowly in mouth' },
];

// ──────────────────────────────────────────────
// Route of Administration — FDA Categories
// ──────────────────────────────────────────────

export interface RouteOption {
  id: RouteOfAdministration;
  label: string;
  description: string;
}

export const ROUTES_OF_ADMINISTRATION: RouteOption[] = [
  { id: 'oral', label: 'Oral', description: 'Swallow with water' },
  { id: 'sublingual', label: 'Sublingual', description: 'Dissolve under tongue' },
  { id: 'topical', label: 'Topical', description: 'Apply to skin surface' },
  { id: 'inhaled', label: 'Inhaled', description: 'Breathe into lungs' },
  { id: 'subcutaneous', label: 'Subcutaneous', description: 'Inject under skin' },
  { id: 'intramuscular', label: 'Intramuscular', description: 'Inject into muscle' },
  { id: 'intravenous', label: 'Intravenous', description: 'Infuse into vein' },
  { id: 'rectal', label: 'Rectal', description: 'Insert rectally' },
  { id: 'nasal', label: 'Nasal', description: 'Spray into nose' },
  { id: 'optic', label: 'Eye (Optic)', description: 'Drop into eye' },
  { id: 'otic', label: 'Ear (Otic)', description: 'Drop into ear canal' },
  { id: 'transdermal', label: 'Transdermal', description: 'Absorb through skin patch' },
];

// ──────────────────────────────────────────────
// Unit options — context-aware by medication form
// ──────────────────────────────────────────────

export const UNIT_OPTIONS_BY_FORM: Record<MedicationForm, string[]> = {
  tablet: ['mg', 'mcg', 'g', 'IU'],
  capsule: ['mg', 'mcg', 'g', 'IU'],
  liquid: ['mL', 'L', 'tsp', 'tbsp', 'mg/mL'],
  injection: ['mL', 'mg', 'IU', 'units', 'mcg'],
  inhaler: ['mcg', 'mg', 'puff'],
  patch: ['mg', 'mcg', 'mg/hr', 'mcg/hr'],
  cream: ['g', 'mg', '%', 'mg/g'],
  drops: ['drop', 'mL', 'mg'],
  suppository: ['mg', 'g'],
  spray: ['mcg', 'mg', 'spray'],
  powder: ['mg', 'g', 'scoop', 'packet'],
  lozenge: ['mg', 'mcg'],
};

/** Fallback unit list (all unique units) */
export const ALL_UNIT_OPTIONS = [
  'mg', 'mcg', 'g', 'mL', 'L', 'IU', 'units',
  'tsp', 'tbsp', 'mg/mL', 'mg/hr', 'mcg/hr', 'mg/g',
  'tablet', 'capsule', 'drop', 'puff', 'spray',
  'scoop', 'packet', '%',
];

/** Legacy flat list for backwards compatibility */
export const UNIT_OPTIONS = ['mg', 'mcg', 'g', 'mL', 'IU', 'tablet', 'capsule', 'drop', 'puff'];

// ──────────────────────────────────────────────
// Default route mapping per form
// ──────────────────────────────────────────────

export const DEFAULT_ROUTE_FOR_FORM: Record<MedicationForm, RouteOfAdministration> = {
  tablet: 'oral',
  capsule: 'oral',
  liquid: 'oral',
  injection: 'subcutaneous',
  inhaler: 'inhaled',
  patch: 'transdermal',
  cream: 'topical',
  drops: 'optic',
  suppository: 'rectal',
  spray: 'nasal',
  powder: 'oral',
  lozenge: 'oral',
};

// ──────────────────────────────────────────────
// Default icon per form
// ──────────────────────────────────────────────

export const ICON_FOR_FORM: Record<MedicationForm, string> = {
  tablet: 'pills.fill',
  capsule: 'capsule.fill',
  liquid: 'drop.fill',
  injection: 'syringe.fill',
  inhaler: 'wind',
  patch: 'bandage.fill',
  cream: 'hand.raised.fill',
  drops: 'eyedropper.halffull',
  suppository: 'pill.fill',
  spray: 'aqi.medium',
  powder: 'sparkles',
  lozenge: 'circle.fill',
};

// ──────────────────────────────────────────────
// Dose quantity label per form
// ──────────────────────────────────────────────

export const DOSE_QUANTITY_LABEL: Record<MedicationForm, string> = {
  tablet: 'tablet(s)',
  capsule: 'capsule(s)',
  liquid: 'mL',
  injection: 'injection(s)',
  inhaler: 'puff(s)',
  patch: 'patch(es)',
  cream: 'application(s)',
  drops: 'drop(s)',
  suppository: 'suppository(ies)',
  spray: 'spray(s)',
  powder: 'scoop(s)',
  lozenge: 'lozenge(s)',
};

// ──────────────────────────────────────────────
// Meal Relation
// ──────────────────────────────────────────────

export interface MealRelationOption {
  id: MealRelation;
  label: string;
  icon: string;
  description: string;
}

export const MEAL_RELATION_OPTIONS: MealRelationOption[] = [
  { id: 'no_restriction', label: 'Any time', icon: 'checkmark.circle', description: 'No food timing needed' },
  { id: 'before_meal', label: 'Before meals', icon: 'clock.arrow.circlepath', description: '30–60 min before eating' },
  { id: 'with_meal', label: 'With food', icon: 'fork.knife.circle.fill', description: 'Take during or right after a meal' },
  { id: 'after_meal', label: 'After meals', icon: 'checkmark.circle.fill', description: 'Within 30 min after eating' },
  { id: 'empty_stomach', label: 'Empty stomach', icon: 'xmark.circle', description: '≥ 2 hours after last meal' },
];

// ──────────────────────────────────────────────
// Frequency options — expanded
// ──────────────────────────────────────────────

export interface FrequencyOption {
  id: FrequencyType;
  label: string;
  icon: string;
  description: string;
}

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { id: 'daily', label: 'Every day', icon: 'calendar', description: 'Same times each day' },
  { id: 'specific_days', label: 'Specific days', icon: 'calendar.badge.checkmark', description: 'Select which days' },
  { id: 'every_x_hours', label: 'Every X hours', icon: 'clock.fill', description: 'Regular time intervals' },
  { id: 'x_times_daily', label: 'X times daily', icon: 'repeat', description: 'Multiple doses per day' },
  { id: 'weekly', label: 'Weekly', icon: 'calendar.badge.clock', description: 'Once per week' },
  { id: 'monthly', label: 'Monthly', icon: 'calendar.circle', description: 'Once per month' },
  { id: 'cyclical', label: 'Cyclical', icon: 'arrow.triangle.2.circlepath', description: 'On/off cycle (e.g. birth control)' },
  { id: 'as_needed', label: 'As needed (PRN)', icon: 'hand.raised.fill', description: 'When symptoms occur' },
];

export const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  daily: 'Every day',
  specific_days: 'Specific days',
  every_x_hours: 'Every X hours',
  x_times_daily: 'X times daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  cyclical: 'Cyclical',
  as_needed: 'As needed',
};

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ──────────────────────────────────────────────
// Time presets for quick scheduling
// ──────────────────────────────────────────────

export interface TimePreset {
  label: string;
  time: string;
  icon: string;
}

export const TIME_PRESETS: TimePreset[] = [
  { label: 'Morning', time: '08:00', icon: 'sunrise.fill' },
  { label: 'Noon', time: '12:00', icon: 'sun.max.fill' },
  { label: 'Afternoon', time: '15:00', icon: 'sun.min.fill' },
  { label: 'Evening', time: '18:00', icon: 'sunset.fill' },
  { label: 'Bedtime', time: '22:00', icon: 'moon.fill' },
];

// ──────────────────────────────────────────────
// Treatment duration options
// ──────────────────────────────────────────────

export interface DurationOption {
  id: TreatmentDurationType;
  label: string;
  description: string;
  icon: string;
}

export const DURATION_OPTIONS: DurationOption[] = [
  { id: 'ongoing', label: 'Ongoing', description: 'Continuous / no end date', icon: 'infinity' },
  { id: 'specific_days', label: 'Days', description: 'Set number of days', icon: 'calendar.day.timeline.left' },
  { id: 'specific_weeks', label: 'Weeks', description: 'Set number of weeks', icon: 'calendar.badge.clock' },
  { id: 'specific_months', label: 'Months', description: 'Set number of months', icon: 'calendar.circle' },
  { id: 'until_date', label: 'Until date', description: 'Pick an end date', icon: 'calendar.badge.exclamationmark' },
];

// ──────────────────────────────────────────────
// Reminder timing options
// ──────────────────────────────────────────────

export const REMINDER_TIMING_OPTIONS = [
  { value: 0, label: 'At scheduled time' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
];

// ──────────────────────────────────────────────
// Med colors — expanded palette
// ──────────────────────────────────────────────

export const MED_COLORS = [
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9F0A', // Amber
  '#FF3B30', // Red
  '#AF52DE', // Purple
  '#00C7BE', // Teal
  '#FF6482', // Pink
  '#5856D6', // Indigo
  '#FFD60A', // Yellow
  '#64D2FF', // Cyan
  '#30D158', // Mint
  '#BF5AF2', // Violet
] as const;

// ──────────────────────────────────────────────
// Zod schemas — 5-step form validation
// ──────────────────────────────────────────────

/** Step 1: Medication type & name */
export const addMedStep1Schema = z.object({
  name: z.string().min(1, 'Medication name is required').max(100),
  form: z.string().min(1, 'Select a medication form'),
});

/** Step 2: Dosage, unit, route, meal relation */
export const addMedStep2Schema = z.object({
  dosage: z.string().min(1, 'Dosage is required'),
  unit: z.string().min(1, 'Unit is required'),
  doseQuantity: z.number().min(0.25, 'Must be at least 0.25').max(100),
  route: z.string().min(1, 'Route is required'),
  mealRelation: z.string().min(1, 'Meal relation is required'),
});

/** Step 3: Schedule (validated manually due to conditional fields) */
export const addMedStep3Schema = z.object({
  frequency: z.enum([
    'daily', 'specific_days', 'every_x_hours', 'x_times_daily',
    'weekly', 'monthly', 'cyclical', 'as_needed',
  ]),
  times: z.array(z.string()).optional(),
  days: z.array(z.number()).optional(),
  intervalHours: z.number().min(1).max(24).optional(),
  timesPerDay: z.number().min(1).max(12).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  cycleDaysOn: z.number().min(1).max(365).optional(),
  cycleDaysOff: z.number().min(1).max(365).optional(),
  startDate: z.string().optional(),
});

/** Step 4: Duration, reminders, refill */
export const addMedStep4Schema = z.object({
  treatmentDurationType: z.string().min(1),
  treatmentDurationValue: z.number().optional(),
  treatmentEndDate: z.string().optional(),
  reminderEnabled: z.boolean(),
  reminderMinutesBefore: z.number(),
  refillEnabled: z.boolean(),
  currentStock: z.number().optional(),
  refillAt: z.number().optional(),
});

/** Step 5: Personalize */
export const addMedStep5Schema = z.object({
  color: z.string(),
  notes: z.string().optional(),
});

export type AddMedStep1 = z.infer<typeof addMedStep1Schema>;
export type AddMedStep2 = z.infer<typeof addMedStep2Schema>;
export type AddMedStep3 = z.infer<typeof addMedStep3Schema>;
export type AddMedStep4 = z.infer<typeof addMedStep4Schema>;
export type AddMedStep5 = z.infer<typeof addMedStep5Schema>;

/** Combined form data shape for the entire wizard */
export interface AddMedFormData {
  // Step 1
  name: string;
  form: MedicationForm;
  // Step 2
  dosage: string;
  unit: string;
  doseQuantity: number;
  route: RouteOfAdministration;
  mealRelation: MealRelation;
  // Step 3
  schedule: MedSchedule;
  // Step 4
  treatmentDuration: TreatmentDuration;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  refill: RefillTracking;
  // Step 5
  color: string;
  notes: string;
}

