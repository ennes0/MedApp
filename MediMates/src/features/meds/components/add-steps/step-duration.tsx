/**
 * Step 4 — Duration & Reminders
 *
 * Treatment duration (ongoing, X days/weeks/months, until date),
 * reminder preferences (timing), and refill tracking.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Controller, useWatch, type Control, type FieldErrors, type UseFormSetValue } from 'react-hook-form';
import { MotiView, AnimatePresence } from 'moti';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Card } from '@/src/design-system/components/card';
import { Chip } from '@/src/design-system/components/chip';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DURATION_OPTIONS, REMINDER_TIMING_OPTIONS, type AddMedStep4 } from '../../types';

interface Props {
  control: Control<AddMedStep4>;
  errors: FieldErrors<AddMedStep4>;
  setValue: UseFormSetValue<AddMedStep4>;
}

export function StepDuration({ control, errors, setValue }: Props) {
  const c = useColors();
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // useWatch hooks — these properly subscribe this component to form field changes
  const durationType = useWatch({ control, name: 'treatmentDurationType' });
  const reminderEnabled = useWatch({ control, name: 'reminderEnabled' });
  const refillEnabled = useWatch({ control, name: 'refillEnabled' });
  const currentStock = useWatch({ control, name: 'currentStock' });

  const handleEndDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowEndDatePicker(false);
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setValue('treatmentEndDate', `${yyyy}-${mm}-${dd}`);
  };

  /** Reset irrelevant fields when switching duration type */
  const handleDurationTypeChange = (
    onChange: (value: string) => void,
    newType: string,
  ) => {
    onChange(newType);
    if (newType === 'ongoing' || newType === 'until_date') {
      setValue('treatmentDurationValue', undefined);
    }
    if (newType !== 'until_date') {
      setValue('treatmentEndDate', undefined);
    }
  };

  return (
    <View>
      <Text style={[styles.stepTitle, { color: c.textPrimary }]}>
        How long & reminders
      </Text>
      <Text style={[styles.stepSub, { color: c.textSecondary }]}>
        Set treatment duration, reminders, and refill tracking.
      </Text>

      {/* ── Treatment Duration ── */}
      <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>
        Treatment Duration
      </Text>
      <Controller
        control={control}
        name="treatmentDurationType"
        render={({ field: { onChange, value } }) => (
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((d) => {
              const isSelected = value === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => handleDurationTypeChange(onChange, d.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.durationCard,
                      {
                        backgroundColor: isSelected ? c.primaryLight : c.surface,
                        borderColor: isSelected ? c.primary : c.borderLight,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <IconSymbol
                      name={d.icon as any}
                      size={20}
                      color={isSelected ? c.primary : c.textTertiary}
                    />
                    <Text
                      style={[
                        styles.durationLabel,
                        {
                          color: isSelected ? c.primary : c.textPrimary,
                          fontWeight: isSelected ? '600' : '400',
                        },
                      ]}
                    >
                      {d.label}
                    </Text>
                    <Text style={[styles.durationDesc, { color: c.textTertiary }]} numberOfLines={1}>
                      {d.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />

      {/* ── Duration value (days/weeks/months) ── */}
      <AnimatePresence>
        {(durationType === 'specific_days' ||
          durationType === 'specific_weeks' ||
          durationType === 'specific_months') && (
          <MotiView
            key="durationValue"
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -8 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Card variant="filled" style={styles.valueCard}>
              <View style={styles.valueRow}>
                <Text style={[styles.valueText, { color: c.textSecondary }]}>For</Text>
                <Controller
                  control={control}
                  name="treatmentDurationValue"
                  render={({ field: { onChange, value } }) => (
                    <View
                      style={[
                        styles.valueInput,
                        { backgroundColor: c.background, borderColor: c.border },
                      ]}
                    >
                      <TextInput
                        value={value?.toString() ?? ''}
                        onChangeText={(t) => {
                          const num = parseInt(t, 10);
                          if (!isNaN(num) && num >= 1) {
                            onChange(num);
                          } else if (t === '') {
                            onChange(undefined);
                          }
                        }}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        style={[styles.valueInputText, { color: c.textPrimary }]}
                        placeholder="7"
                        placeholderTextColor={c.textTertiary}
                        maxLength={3}
                      />
                    </View>
                  )}
                />
                <Text style={[styles.valueText, { color: c.textSecondary }]}>
                  {durationType === 'specific_days'
                    ? 'days'
                    : durationType === 'specific_weeks'
                      ? 'weeks'
                      : 'months'}
                </Text>
              </View>
            </Card>
          </MotiView>
        )}
      </AnimatePresence>

      {/* ── Until date ── */}
      <AnimatePresence>
        {durationType === 'until_date' && (
          <MotiView
            key="untilDate"
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -8 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Controller
              control={control}
              name="treatmentEndDate"
              render={({ field: { value } }) => (
                <>
                  <TouchableOpacity
                    onPress={() => setShowEndDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Card variant="filled" style={styles.dateCard}>
                      <IconSymbol name="calendar" size={18} color={c.primary} />
                      <Text
                        style={[
                          styles.dateText,
                          { color: value ? c.textPrimary : c.textTertiary },
                        ]}
                      >
                        {value ?? 'Select end date'}
                      </Text>
                    </Card>
                  </TouchableOpacity>
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={value ? new Date(value) : new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleEndDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                </>
              )}
            />
          </MotiView>
        )}
      </AnimatePresence>

      {/* ── Reminders ── */}
      <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Reminders</Text>
      <Controller
        control={control}
        name="reminderEnabled"
        render={({ field: { onChange, value } }) => (
          <TouchableOpacity
            onPress={() => onChange(!value)}
            activeOpacity={0.7}
          >
            <Card variant="elevated" style={styles.reminderCard}>
              <View style={styles.reminderRow}>
                <IconSymbol
                  name={value ? 'bell.badge.fill' : 'bell.slash'}
                  size={24}
                  color={value ? c.primary : c.textTertiary}
                />
                <View style={styles.reminderTextWrap}>
                  <Text style={[styles.reminderLabel, { color: c.textPrimary }]}>
                    Push Notifications
                  </Text>
                  <Text style={[styles.reminderHint, { color: c.textSecondary }]}>
                    {value
                      ? 'You will receive dose reminders'
                      : 'No notification reminders'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggleTrack,
                    { backgroundColor: value ? c.primary : c.separator },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      { transform: [{ translateX: value ? 20 : 2 }] },
                    ]}
                  />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />

      {/* ── Reminder timing ── */}
      <AnimatePresence>
        {reminderEnabled && (
          <MotiView
            key="reminderTiming"
            from={{ opacity: 0, translateY: -6 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -6 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Text style={[styles.subLabel, { color: c.textSecondary }]}>When to notify?</Text>
            <Controller
              control={control}
              name="reminderMinutesBefore"
              render={({ field: { onChange, value } }) => (
                <View style={styles.timingRow}>
                  {REMINDER_TIMING_OPTIONS.map((opt) => {
                    const isSelected = value === opt.value;
                    return (
                      <Chip
                        key={opt.value}
                        label={opt.label}
                        selected={isSelected}
                        onPress={() => onChange(opt.value)}
                      />
                    );
                  })}
                </View>
              )}
            />
          </MotiView>
        )}
      </AnimatePresence>

      {/* ── Refill Tracking ── */}
      <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>
        Refill Tracking
      </Text>
      <Controller
        control={control}
        name="refillEnabled"
        render={({ field: { onChange, value } }) => (
          <TouchableOpacity
            onPress={() => {
              const newVal = !value;
              onChange(newVal);
              if (newVal && !currentStock) {
                setValue('currentStock', 30);
              }
            }}
            activeOpacity={0.7}
          >
            <Card variant="elevated" style={styles.reminderCard}>
              <View style={styles.reminderRow}>
                <IconSymbol
                  name={value ? 'arrow.triangle.2.circlepath.circle.fill' : 'arrow.triangle.2.circlepath.circle'}
                  size={24}
                  color={value ? c.success : c.textTertiary}
                />
                <View style={styles.reminderTextWrap}>
                  <Text style={[styles.reminderLabel, { color: c.textPrimary }]}>
                    Track Inventory
                  </Text>
                  <Text style={[styles.reminderHint, { color: c.textSecondary }]}>
                    {value
                      ? 'Get notified when running low'
                      : 'No refill reminders'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggleTrack,
                    { backgroundColor: value ? c.success : c.separator },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      { transform: [{ translateX: value ? 20 : 2 }] },
                    ]}
                  />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />

      <AnimatePresence>
        {refillEnabled && (
          <MotiView
            key="refillDetails"
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -8 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Card variant="filled" style={styles.refillCard}>
              <View style={styles.refillRow}>
                <View style={styles.refillField}>
                  <Text style={[styles.refillLabel, { color: c.textSecondary }]}>
                    Current stock
                  </Text>
                  <Controller
                    control={control}
                    name="currentStock"
                    render={({ field: { onChange, value } }) => (
                      <View
                        style={[
                          styles.refillInput,
                          { backgroundColor: c.background, borderColor: c.border },
                        ]}
                      >
                        <TextInput
                          value={value?.toString() ?? ''}
                          onChangeText={(t) => {
                            const num = parseInt(t, 10);
                            if (!isNaN(num) && num >= 0) onChange(num);
                            else if (t === '') onChange(undefined);
                          }}
                          keyboardType="number-pad"
                          returnKeyType="done"
                          style={[styles.refillInputText, { color: c.textPrimary }]}
                          placeholder="30"
                          placeholderTextColor={c.textTertiary}
                          maxLength={4}
                        />
                      </View>
                    )}
                  />
                </View>
                <View style={styles.refillField}>
                  <Text style={[styles.refillLabel, { color: c.textSecondary }]}>
                    Remind at
                  </Text>
                  <Controller
                    control={control}
                    name="refillAt"
                    render={({ field: { onChange, value } }) => (
                      <View
                        style={[
                          styles.refillInput,
                          { backgroundColor: c.background, borderColor: c.border },
                        ]}
                      >
                        <TextInput
                          value={value?.toString() ?? ''}
                          onChangeText={(t) => {
                            const num = parseInt(t, 10);
                            if (!isNaN(num) && num >= 0) onChange(num);
                            else if (t === '') onChange(undefined);
                          }}
                          keyboardType="number-pad"
                          returnKeyType="done"
                          style={[styles.refillInputText, { color: c.textPrimary }]}
                          placeholder="5"
                          placeholderTextColor={c.textTertiary}
                          maxLength={4}
                        />
                      </View>
                    )}
                  />
                  <Text style={[styles.refillHint, { color: c.textTertiary }]}>
                    doses left
                  </Text>
                </View>
              </View>
            </Card>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

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
    marginTop: spacing.md,
  },
  subLabel: {
    ...typography.sizes.subhead,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  durationGrid: {
    gap: spacing.xs,
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  durationLabel: {
    ...typography.sizes.subhead,
  },
  durationDesc: {
    ...typography.sizes.caption1,
    flex: 1,
    textAlign: 'right',
  },
  valueCard: {
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  valueText: {
    ...typography.sizes.body,
    fontWeight: '500',
  },
  valueInput: {
    width: 64,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueInputText: {
    ...typography.sizes.title3,
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  dateText: {
    ...typography.sizes.body,
  },
  reminderCard: {
    marginBottom: spacing.sm,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reminderTextWrap: {
    flex: 1,
  },
  reminderLabel: {
    ...typography.sizes.body,
    fontWeight: '500',
  },
  reminderHint: {
    ...typography.sizes.caption1,
    marginTop: 1,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  timingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  refillCard: {
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  refillRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  refillField: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  refillLabel: {
    ...typography.sizes.footnote,
    fontWeight: '500',
  },
  refillInput: {
    width: '100%',
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refillInputText: {
    ...typography.sizes.title3,
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  refillHint: {
    ...typography.sizes.caption2,
  },
});
