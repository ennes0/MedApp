/**
 * Step 5 — Review & Personalize
 *
 * Color picker, optional notes, and a full summary of all entered data.
 * The user reviews everything before saving.
 */

import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { AppTextInput as TextInput } from '@/src/design-system/components/text-input';
import { Card } from '@/src/design-system/components/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  MED_COLORS,
  MEDICATION_FORMS,
  ROUTES_OF_ADMINISTRATION,
  MEAL_RELATION_OPTIONS,
  FREQUENCY_LABELS,
  DURATION_OPTIONS,
  REMINDER_TIMING_OPTIONS,
  ICON_FOR_FORM,
  IMAGE_FOR_FORM,
  type AddMedStep5,
} from '../../types';
import type {
  MedicationForm,
  RouteOfAdministration,
  MealRelation,
  MedSchedule,
  TreatmentDurationType,
} from '@/src/types/firebase';
import { formatTime } from '@/src/lib/utils';

interface Props {
  control: Control<AddMedStep5>;
  errors: FieldErrors<AddMedStep5>;
  // Summary data from previous steps
  summary: {
    name: string;
    form: MedicationForm;
    dosage: string;
    unit: string;
    doseQuantity: number;
    route: RouteOfAdministration;
    mealRelation: MealRelation;
    schedule: Partial<MedSchedule>;
    treatmentDurationType: TreatmentDurationType;
    treatmentDurationValue?: number;
    treatmentEndDate?: string;
    reminderEnabled: boolean;
    reminderMinutesBefore: number;
    refillEnabled: boolean;
    currentStock?: number;
    refillAt?: number;
  };
}

export function StepReview({ control, errors, summary }: Props) {
  const c = useColors();

  const formOption = MEDICATION_FORMS.find((f) => f.id === summary.form);
  const routeOption = ROUTES_OF_ADMINISTRATION.find((r) => r.id === summary.route);
  const mealOption = MEAL_RELATION_OPTIONS.find((m) => m.id === summary.mealRelation);
  const durationOption = DURATION_OPTIONS.find((d) => d.id === summary.treatmentDurationType);
  const reminderLabel = REMINDER_TIMING_OPTIONS.find(
    (r) => r.value === summary.reminderMinutesBefore,
  )?.label ?? 'At scheduled time';

  const scheduleDesc = getScheduleDescription(summary.schedule);

  return (
    <View>
      <Text style={[styles.stepTitle, { color: c.textPrimary }]}>
        Review & Save
      </Text>
      <Text style={[styles.stepSub, { color: c.textSecondary }]}>
        Confirm your medication details and pick a color.
      </Text>

      {/* ── Summary Card ── */}
      <Controller
        control={control}
        name="color"
        render={({ field: { value: selectedColor } }) => (
          <Card variant="elevated" style={[styles.summaryCard, { borderLeftColor: selectedColor, borderLeftWidth: 4 }]}>
              {/* Header */}
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIconWrap, { backgroundColor: `${selectedColor}15` }]}>
                  {IMAGE_FOR_FORM[summary.form] ? (
                    <Image
                      source={IMAGE_FOR_FORM[summary.form]}
                      style={styles.summaryFormImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <IconSymbol
                      name={(formOption?.icon ?? 'pill.fill') as any}
                      size={28}
                      color={selectedColor}
                    />
                  )}
                </View>
                <View style={styles.summaryHeaderText}>
                  <Text style={[styles.summaryName, { color: c.textPrimary }]}>
                    {summary.name}
                  </Text>
                  <Text style={[styles.summaryType, { color: c.textSecondary }]}>
                    {formOption?.label} · {summary.dosage} {summary.unit}
                  </Text>
                </View>
              </View>

              {/* Detail rows */}
              <View style={[styles.divider, { backgroundColor: c.separator }]} />

              <SummaryRow
                icon="number.circle.fill"
                label="Dose per intake"
                value={`${summary.doseQuantity}`}
                color={c}
              />
              <SummaryRow
                icon="arrow.right.circle.fill"
                label="Route"
                value={routeOption?.label ?? summary.route}
                color={c}
              />
              <SummaryRow
                icon="fork.knife.circle.fill"
                label="Food timing"
                value={mealOption?.label ?? 'Any time'}
                color={c}
              />

              <View style={[styles.divider, { backgroundColor: c.separator }]} />

              <SummaryRow
                icon="calendar.circle.fill"
                label="Schedule"
                value={scheduleDesc}
                color={c}
              />
              {summary.schedule.times && summary.schedule.times.length > 0 && (
                <SummaryRow
                  icon="clock.fill"
                  label="Times"
                  value={summary.schedule.times.map(formatTime).join(', ')}
                  color={c}
                />
              )}

              <View style={[styles.divider, { backgroundColor: c.separator }]} />

              <SummaryRow
                icon="hourglass.circle.fill"
                label="Duration"
                value={getDurationDescription(
                  summary.treatmentDurationType,
                  summary.treatmentDurationValue,
                  summary.treatmentEndDate,
                )}
                color={c}
              />
              <SummaryRow
                icon="bell.circle.fill"
                label="Reminders"
                value={
                  summary.reminderEnabled
                    ? `On · ${reminderLabel}`
                    : 'Off'
                }
                color={c}
              />
              {summary.refillEnabled && (
                <SummaryRow
                  icon="arrow.triangle.2.circlepath.circle.fill"
                  label="Refill tracking"
                  value={
                    summary.currentStock
                      ? `${summary.currentStock} in stock, remind at ${summary.refillAt ?? 5}`
                      : 'Enabled'
                  }
                  color={c}
                />
              )}
          </Card>
        )}
      />

      {/* ── Color Picker ── */}
      <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>
        Choose a color
      </Text>
      <Controller
        control={control}
        name="color"
        render={({ field: { onChange, value } }) => (
          <View style={styles.colorGrid}>
            {MED_COLORS.map((col) => {
              const isSelected = value === col;
              return (
                <TouchableOpacity
                  key={col}
                  onPress={() => onChange(col)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.colorSwatch,
                      {
                        backgroundColor: col,
                        borderColor: c.textPrimary,
                        borderWidth: isSelected ? 3 : 0,
                        transform: [{ scale: isSelected ? 1.2 : 1 }],
                      },
                    ]}
                  >
                    {isSelected && (
                      <IconSymbol name="checkmark" size={18} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />

      {/* ── Notes ── */}
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Notes (optional)"
            placeholder="e.g. Take with food, avoid grapefruit, etc."
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
          />
        )}
      />
    </View>
  );
}

// ── Summary row component ──

function SummaryRow({
  icon,
  label,
  value,
  color: c,
}: {
  icon: string;
  label: string;
  value: string;
  color: ReturnType<typeof useColors>;
}) {
  return (
    <View style={summaryRowStyles.row}>
      <IconSymbol name={icon as any} size={16} color={c.primary} />
      <Text style={[summaryRowStyles.label, { color: c.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[summaryRowStyles.value, { color: c.textPrimary }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const summaryRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: spacing.sm,
  },
  label: {
    ...typography.sizes.footnote,
    width: 100,
  },
  value: {
    ...typography.sizes.footnote,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});

// ── Helpers ──

function getScheduleDescription(schedule: Partial<MedSchedule>): string {
  if (!schedule.frequency) return 'Not set';
  const label = FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency;

  switch (schedule.frequency) {
    case 'every_x_hours':
      return `Every ${schedule.intervalHours ?? '?'} hours`;
    case 'x_times_daily':
      return `${schedule.timesPerDay ?? '?'} times daily`;
    case 'cyclical':
      return `${schedule.cycleDaysOn ?? '?'} days on / ${schedule.cycleDaysOff ?? '?'} days off`;
    case 'monthly':
      return `Monthly (day ${schedule.dayOfMonth ?? '?'})`;
    default:
      return label;
  }
}

function getDurationDescription(
  type: TreatmentDurationType,
  value?: number,
  endDate?: string,
): string {
  switch (type) {
    case 'ongoing':
      return 'Ongoing (no end date)';
    case 'specific_days':
      return value ? `${value} days` : 'Not set';
    case 'specific_weeks':
      return value ? `${value} weeks` : 'Not set';
    case 'specific_months':
      return value ? `${value} months` : 'Not set';
    case 'until_date':
      return endDate ? `Until ${endDate}` : 'Not set';
    default:
      return 'Not set';
  }
}

// ── Styles ──

const styles = StyleSheet.create({
  stepTitle: {
    ...typography.sizes.title2,
    marginBottom: 4,
  },
  stepSub: {
    ...typography.sizes.body,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.sizes.headline,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  summaryCard: {
    overflow: 'hidden',
    borderRadius: radii.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryFormImage: {
    width: 32,
    height: 32,
  },
  summaryHeaderText: {
    flex: 1,
  },
  summaryName: {
    ...typography.sizes.title3,
  },
  summaryType: {
    ...typography.sizes.subhead,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 4,
    marginBottom: spacing.lg,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
