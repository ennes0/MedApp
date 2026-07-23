3/**
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
  DAY_LABELS,
  type AddMedStep5,
} from '../../types';
import type {
  MedicationForm,
  RouteOfAdministration,
  MealRelation,
  MedSchedule,
  TreatmentDurationType,
} from '@/src/types/firebase';
import { formatTime, computeTreatmentEndDate } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  const formOption = MEDICATION_FORMS.find((f) => f.id === summary.form);
  const routeOption = ROUTES_OF_ADMINISTRATION.find((r) => r.id === summary.route);
  const mealOption = MEAL_RELATION_OPTIONS.find((m) => m.id === summary.mealRelation);
  const reminderLabel = REMINDER_TIMING_OPTIONS.find(
    (r) => r.value === summary.reminderMinutesBefore,
  )?.label ?? t('addMedSteps.review.atScheduledTime');

  const scheduleDesc = getScheduleDescription(summary.schedule, t);
  const daysDesc = getDaysDescription(summary.schedule);

  return (
    <View>
      <Text style={[styles.stepTitle, { color: c.textPrimary }]}>
        {t('addMedSteps.review.title')}
      </Text>
      <Text style={[styles.stepSub, { color: c.textSecondary }]}>
        {t('addMedSteps.review.subtitle')}
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

              {/* ── Dosage & Instructions ── */}
              <View style={[styles.sectionDivider, { backgroundColor: c.separator }]}>
                <View style={[styles.sectionBadge, { backgroundColor: c.primaryLight }]}>
                  <IconSymbol name="cross.case.fill" size={10} color={c.primary} />
                  <Text style={[styles.sectionBadgeText, { color: c.primary }]}>{t('addMedSteps.review.dosage')}</Text>
                </View>
              </View>

              <SummaryRow
                icon="number.circle.fill"
                label={t('addMedSteps.review.perIntake')}
                value={`${summary.doseQuantity} ${formOption?.label?.toLowerCase() ?? ''}`}
                color={c}
              />
              <SummaryRow
                icon="arrow.right.circle.fill"
                label={t('addMedSteps.review.route')}
                value={routeOption?.label ?? summary.route}
                color={c}
              />
              <SummaryRow
                icon="fork.knife.circle.fill"
                label={t('addMedSteps.review.foodTiming')}
                value={mealOption?.label ?? t('addMedSteps.review.anyTime')}
                color={c}
              />

              {/* ── Schedule ── */}
              <View style={[styles.sectionDivider, { backgroundColor: c.separator }]}>
                <View style={[styles.sectionBadge, { backgroundColor: c.primaryLight }]}>
                  <IconSymbol name="clock.fill" size={10} color={c.primary} />
                  <Text style={[styles.sectionBadgeText, { color: c.primary }]}>{t('addMedSteps.review.schedule')}</Text>
                </View>
              </View>

              <SummaryRow
                icon="calendar.circle.fill"
                label={t('addMedSteps.review.frequency')}
                value={scheduleDesc}
                color={c}
              />
              {daysDesc && (
                <SummaryRow
                  icon="calendar.badge.checkmark"
                  label={t('addMedSteps.review.days')}
                  value={daysDesc}
                  color={c}
                />
              )}
              {summary.schedule.times && summary.schedule.times.length > 0 && (
                <SummaryRow
                  icon="clock.fill"
                  label={t('addMedSteps.review.times')}
                  value={summary.schedule.times.map(formatTime).join(', ')}
                  color={c}
                />
              )}
              {summary.schedule.startDate && (
                <SummaryRow
                  icon="calendar"
                  label={t('addMedSteps.review.starts')}
                  value={summary.schedule.startDate}
                  color={c}
                />
              )}

              {/* ── Duration & Reminders ── */}
              <View style={[styles.sectionDivider, { backgroundColor: c.separator }]}>
                <View style={[styles.sectionBadge, { backgroundColor: c.primaryLight }]}>
                  <IconSymbol name="hourglass" size={10} color={c.primary} />
                  <Text style={[styles.sectionBadgeText, { color: c.primary }]}>{t('addMedSteps.review.durationAndReminders')}</Text>
                </View>
              </View>

              <SummaryRow
                icon="hourglass.circle.fill"
                label={t('addMedSteps.review.duration')}
                value={getDurationDescription(
                  summary.treatmentDurationType,
                  summary.treatmentDurationValue,
                  summary.treatmentEndDate,
                  summary.schedule.startDate,
                  t,
                )}
                color={c}
              />
              <SummaryRow
                icon="bell.circle.fill"
                label={t('addMedSteps.review.reminders')}
                value={
                  summary.reminderEnabled
                    ? `${t('medDetail.on')} · ${reminderLabel}`
                    : t('medDetail.off')
                }
                color={c}
                valueColor={summary.reminderEnabled ? c.success : c.textTertiary}
              />
              <SummaryRow
                icon="arrow.triangle.2.circlepath.circle.fill"
                label={t('addMedSteps.review.refillTracking')}
                value={
                  summary.refillEnabled
                    ? summary.currentStock
                      ? `${t('medDetail.inStock', { count: summary.currentStock })} · ${t('medDetail.remindAt', { count: summary.refillAt ?? 5 })}`
                      : t('medDetail.enabled')
                    : t('medDetail.off')
                }
                color={c}
                valueColor={summary.refillEnabled ? c.success : c.textTertiary}
              />
          </Card>
        )}
      />

      {/* ── Color Picker ── */}
      <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>
        {t('addMedSteps.review.chooseColor')}
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
            label={t('addMedSteps.review.notesOptional')}
          
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
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  color: ReturnType<typeof useColors>;
  valueColor?: string;
}) {
  return (
    <View style={summaryRowStyles.row}>
      <IconSymbol name={icon as any} size={16} color={c.primary} />
      <Text style={[summaryRowStyles.label, { color: c.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[summaryRowStyles.value, { color: valueColor ?? c.textPrimary }]}
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

function getScheduleDescription(
  schedule: Partial<MedSchedule>,
  t: (key: string, options?: any) => string,
): string {
  if (!schedule.frequency) return t('addMedSteps.review.notSet');
  const label = FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency;

  switch (schedule.frequency) {
    case 'every_x_hours':
      return t('addMedSteps.review.everyHours', { count: schedule.intervalHours ?? '?' });
    case 'x_times_daily':
      return t('addMedSteps.review.timesDaily', { count: schedule.timesPerDay ?? '?' });
    case 'cyclical':
      return t('addMedSteps.review.cyclical', {
        on: schedule.cycleDaysOn ?? '?',
        off: schedule.cycleDaysOff ?? '?',
      });
    case 'monthly':
      return t('addMedSteps.review.monthlyDay', { day: schedule.dayOfMonth ?? '?' });
    default:
      return label;
  }
}

function getDaysDescription(schedule: Partial<MedSchedule>): string | null {
  if (
    (schedule.frequency === 'specific_days' || schedule.frequency === 'weekly') &&
    schedule.daysOfWeek &&
    schedule.daysOfWeek.length > 0
  ) {
    return schedule.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ');
  }
  return null;
}

function getDurationDescription(
  type: TreatmentDurationType,
  value?: number,
  endDate?: string,
  startDate?: string,
  t?: (key: string, options?: any) => string,
): string {
  const tr = t ?? ((key: string) => key);
  switch (type) {
    case 'ongoing':
      return tr('addMedSteps.review.ongoing');
    case 'specific_days':
    case 'specific_weeks':
    case 'specific_months': {
      if (!value) return tr('addMedSteps.review.notSet');
      const unit = type.replace('specific_', '');
      const label = `${value} ${unit}${value > 1 ? '' : ''}`;
      const computedEnd = endDate ?? computeTreatmentEndDate(
        { type, value },
        startDate,
      );
      return computedEnd ? tr('addMedSteps.review.endsOn', { label, date: computedEnd }) : label;
    }
    case 'until_date':
      return endDate ? tr('addMedSteps.review.untilDate', { date: endDate }) : tr('addMedSteps.review.notSet');
    default:
      return tr('addMedSteps.review.notSet');
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
    marginBottom: spacing.xs,
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
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  sectionBadge: {
    position: 'absolute',
    top: -10,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  sectionBadgeText: {
    ...typography.sizes.caption2,
    fontWeight: '600',
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
