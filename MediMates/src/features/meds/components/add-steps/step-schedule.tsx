/**
 * Step 3 — Schedule
 *
 * Enhanced schedule picker with 8 frequency types,
 * time presets, day selectors, cyclical patterns, start date, etc.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MotiView, AnimatePresence } from 'moti';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Chip } from '@/src/design-system/components/chip';
import { Button } from '@/src/design-system/components/button';
import { Card } from '@/src/design-system/components/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  FREQUENCY_OPTIONS,
  DAY_LABELS,
  TIME_PRESETS,
} from '../../types';
import type { MedSchedule, FrequencyType } from '@/src/types/firebase';
import { formatTime } from '@/src/lib/utils';

interface Props {
  schedule: Partial<MedSchedule>;
  onChange: (schedule: Partial<MedSchedule>) => void;
}

export function StepSchedule({ schedule, onChange }: Props) {
  const c = useColors();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftTime, setDraftTime] = useState(new Date());
  const [draftStartDate, setDraftStartDate] = useState(new Date());

  // ── Frequency ──
  const handleFrequencyChange = useCallback(
    (f: FrequencyType) => {
      const updated: Partial<MedSchedule> = { ...schedule, frequency: f };
      // Reset irrelevant fields
      if (f === 'daily') {
        delete updated.daysOfWeek;
        delete updated.intervalHours;
        delete updated.timesPerDay;
        delete updated.dayOfMonth;
        delete updated.cycleDaysOn;
        delete updated.cycleDaysOff;
        if (!updated.times?.length) updated.times = ['08:00'];
      }
      if (f === 'specific_days') {
        delete updated.intervalHours;
        delete updated.timesPerDay;
        delete updated.dayOfMonth;
        delete updated.cycleDaysOn;
        delete updated.cycleDaysOff;
        if (!updated.times?.length) updated.times = ['08:00'];
      }
      if (f === 'every_x_hours') {
        delete updated.daysOfWeek;
        delete updated.timesPerDay;
        delete updated.dayOfMonth;
        delete updated.cycleDaysOn;
        delete updated.cycleDaysOff;
        updated.intervalHours = schedule.intervalHours ?? 8;
        updated.times = [];
      }
      if (f === 'x_times_daily') {
        delete updated.daysOfWeek;
        delete updated.intervalHours;
        delete updated.dayOfMonth;
        delete updated.cycleDaysOn;
        delete updated.cycleDaysOff;
        updated.timesPerDay = schedule.timesPerDay ?? 2;
        updated.times = generateEvenTimes(schedule.timesPerDay ?? 2);
      }
      if (f === 'weekly') {
        delete updated.intervalHours;
        delete updated.timesPerDay;
        delete updated.dayOfMonth;
        delete updated.cycleDaysOn;
        delete updated.cycleDaysOff;
        if (!updated.daysOfWeek?.length) updated.daysOfWeek = [1]; // Monday default
        if (!updated.times?.length) updated.times = ['08:00'];
      }
      if (f === 'monthly') {
        delete updated.daysOfWeek;
        delete updated.intervalHours;
        delete updated.timesPerDay;
        delete updated.cycleDaysOn;
        delete updated.cycleDaysOff;
        updated.dayOfMonth = schedule.dayOfMonth ?? 1;
        if (!updated.times?.length) updated.times = ['08:00'];
      }
      if (f === 'cyclical') {
        delete updated.daysOfWeek;
        delete updated.intervalHours;
        delete updated.timesPerDay;
        delete updated.dayOfMonth;
        updated.cycleDaysOn = schedule.cycleDaysOn ?? 21;
        updated.cycleDaysOff = schedule.cycleDaysOff ?? 7;
        if (!updated.times?.length) updated.times = ['08:00'];
      }
      if (f === 'as_needed') {
        delete updated.daysOfWeek;
        delete updated.intervalHours;
        delete updated.timesPerDay;
        delete updated.dayOfMonth;
        delete updated.cycleDaysOn;
        delete updated.cycleDaysOff;
        updated.times = [];
      }
      onChange(updated);
    },
    [schedule, onChange],
  );

  // ── Day toggles ──
  const toggleDay = useCallback(
    (day: number) => {
      const current = schedule.daysOfWeek ?? [];
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort();
      onChange({ ...schedule, daysOfWeek: updated });
    },
    [schedule, onChange],
  );

  // ── Time management ──
  const commitTime = useCallback(
    (date: Date) => {
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      const timeStr = `${hh}:${mm}`;
      const times = [...(schedule.times ?? [])];
      if (!times.includes(timeStr)) {
        times.push(timeStr);
        times.sort();
      }
      onChange({ ...schedule, times });
    },
    [schedule, onChange],
  );

  const addTime = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (event.type === 'dismissed') {
        setShowTimePicker(false);
        return;
      }
      if (!date) return;
      if (Platform.OS === 'ios') {
        setDraftTime(date);
        return;
      }
      commitTime(date);
      setShowTimePicker(false);
    },
    [commitTime],
  );

  const removeTime = useCallback(
    (t: string) => {
      const times = (schedule.times ?? []).filter((x) => x !== t);
      onChange({ ...schedule, times });
    },
    [schedule, onChange],
  );

  const addPresetTime = useCallback(
    (time: string) => {
      const times = [...(schedule.times ?? [])];
      if (!times.includes(time)) {
        times.push(time);
        times.sort();
      }
      onChange({ ...schedule, times });
    },
    [schedule, onChange],
  );

  // ── Start date ──
  const commitStartDate = useCallback(
    (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      onChange({ ...schedule, startDate: `${yyyy}-${mm}-${dd}` });
    },
    [schedule, onChange],
  );

  const handleStartDateChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (event.type === 'dismissed') {
        setShowDatePicker(false);
        return;
      }
      if (!date) return;
      if (Platform.OS === 'ios') {
        setDraftStartDate(date);
        return;
      }
      commitStartDate(date);
      setShowDatePicker(false);
    },
    [commitStartDate],
  );

  const needsTimes =
    schedule.frequency !== 'as_needed' &&
    schedule.frequency !== 'every_x_hours';

  return (
    <View>
      <Text style={[styles.stepTitle, { color: c.textPrimary }]}>
        When do you take it?
      </Text>
      <Text style={[styles.stepSub, { color: c.textSecondary }]}>
        Set your medication schedule.
      </Text>

      {/* ── Frequency ── */}
      <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Frequency</Text>
      <View style={styles.frequencyGrid}>
        {FREQUENCY_OPTIONS.map((f) => {
          const isSelected = schedule.frequency === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => handleFrequencyChange(f.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.freqCard,
                  {
                    backgroundColor: isSelected ? c.primaryLight : c.surface,
                    borderColor: isSelected ? c.primary : c.borderLight,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <IconSymbol
                  name={f.icon as any}
                  size={18}
                  color={isSelected ? c.primary : c.textTertiary}
                />
                <View style={styles.freqTextWrap}>
                  <Text
                    style={[
                      styles.freqLabel,
                      {
                        color: isSelected ? c.primary : c.textPrimary,
                        fontWeight: isSelected ? '600' : '400',
                      },
                    ]}
                  >
                    {f.label}
                  </Text>
                  <Text style={[styles.freqDesc, { color: c.textTertiary }]} numberOfLines={1}>
                    {f.description}
                  </Text>
                </View>
                {isSelected && (
                  <IconSymbol name="checkmark.circle.fill" size={18} color={c.primary} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Days (specific_days / weekly) ── */}
      <AnimatePresence>
        {(schedule.frequency === 'specific_days' || schedule.frequency === 'weekly') && (
          <MotiView
            key="days"
            from={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' as any }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'timing', duration: 250 }}
          >
            <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>
              Which days?
            </Text>
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, idx) => {
                const isSelected = schedule.daysOfWeek?.includes(idx) ?? false;
                return (
                  <TouchableOpacity key={idx} onPress={() => toggleDay(idx)} activeOpacity={0.7}>
                    <View
                      style={[
                        styles.dayCircle,
                        {
                          backgroundColor: isSelected ? c.primary : c.surface,
                          borderColor: isSelected ? c.primary : c.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayLabel,
                          { color: isSelected ? '#FFFFFF' : c.textSecondary },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </MotiView>
        )}
      </AnimatePresence>

      {/* ── Interval hours ── */}
      <AnimatePresence>
        {schedule.frequency === 'every_x_hours' && (
          <MotiView
            key="interval"
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -8 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Interval</Text>
            <Card variant="filled" style={styles.intervalCard}>
              <View style={styles.intervalRow}>
                <Text style={[styles.intervalText, { color: c.textSecondary }]}>Every</Text>
                <View
                  style={[
                    styles.intervalInput,
                    { backgroundColor: c.background, borderColor: c.border },
                  ]}
                >
                  <TextInput
                    value={schedule.intervalHours?.toString() ?? ''}
                    onChangeText={(t) => {
                      const num = parseInt(t, 10);
                      if (!isNaN(num) && num >= 1 && num <= 24) {
                        onChange({ ...schedule, intervalHours: num });
                      } else if (t === '') {
                        onChange({ ...schedule, intervalHours: undefined });
                      }
                    }}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    style={[styles.intervalTextInput, { color: c.textPrimary }]}
                    placeholder="8"
                    placeholderTextColor={c.textTertiary}
                    maxLength={2}
                  />
                </View>
                <Text style={[styles.intervalText, { color: c.textSecondary }]}>hours</Text>
              </View>
              <Text style={[styles.intervalHint, { color: c.textTertiary }]}>
                Example: Every {schedule.intervalHours ?? 8}h → ~{Math.floor(16 / (schedule.intervalHours ?? 8))} doses/day (8 AM–10 PM)
              </Text>
            </Card>
          </MotiView>
        )}
      </AnimatePresence>

      {/* ── X times daily ── */}
      <AnimatePresence>
        {schedule.frequency === 'x_times_daily' && (
          <MotiView
            key="xTimesDaily"
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -8 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>
              How many times per day?
            </Text>
            <View style={styles.timesPerDayRow}>
              {[1, 2, 3, 4, 5, 6].map((n) => {
                const isSelected = schedule.timesPerDay === n;
                return (
                  <TouchableOpacity
                    key={n}
                    onPress={() => {
                      const times = generateEvenTimes(n);
                      onChange({ ...schedule, timesPerDay: n, times });
                    }}
                  >
                    <View
                      style={[
                        styles.timesPerDayChip,
                        {
                          backgroundColor: isSelected ? c.primary : c.surface,
                          borderColor: isSelected ? c.primary : c.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timesPerDayText,
                          { color: isSelected ? '#FFFFFF' : c.textPrimary },
                        ]}
                      >
                        {n}×
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {schedule.timesPerDay && (
              <Text style={[styles.autoTimesHint, { color: c.textTertiary }]}>
                Auto-scheduled: {schedule.times?.map(formatTime).join(', ')}
              </Text>
            )}
          </MotiView>
        )}
      </AnimatePresence>

      {/* ── Monthly — day of month ── */}
      <AnimatePresence>
        {schedule.frequency === 'monthly' && (
          <MotiView
            key="monthly"
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -8 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Day of month</Text>
            <Card variant="filled" style={styles.intervalCard}>
              <View style={styles.intervalRow}>
                <Text style={[styles.intervalText, { color: c.textSecondary }]}>On the</Text>
                <View
                  style={[
                    styles.intervalInput,
                    { backgroundColor: c.background, borderColor: c.border },
                  ]}
                >
                  <TextInput
                    value={schedule.dayOfMonth?.toString() ?? ''}
                    onChangeText={(t) => {
                      const num = parseInt(t, 10);
                      if (!isNaN(num) && num >= 1 && num <= 31) {
                        onChange({ ...schedule, dayOfMonth: num });
                      } else if (t === '') {
                        onChange({ ...schedule, dayOfMonth: undefined });
                      }
                    }}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    style={[styles.intervalTextInput, { color: c.textPrimary }]}
                    placeholder="1"
                    placeholderTextColor={c.textTertiary}
                    maxLength={2}
                  />
                </View>
                <Text style={[styles.intervalText, { color: c.textSecondary }]}>
                  of each month
                </Text>
              </View>
            </Card>
          </MotiView>
        )}
      </AnimatePresence>

      {/* ── Cyclical ── */}
      <AnimatePresence>
        {schedule.frequency === 'cyclical' && (
          <MotiView
            key="cyclical"
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -8 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Cycle pattern</Text>
            <Card variant="filled" style={styles.cyclicalCard}>
              <View style={styles.cyclicalRow}>
                <View style={[styles.cyclicalInputWrap, { borderColor: c.primary, backgroundColor: c.primaryLight }]}>
                  <TextInput
                    value={schedule.cycleDaysOn?.toString() ?? ''}
                    onChangeText={(t) => {
                      const num = parseInt(t, 10);
                      if (!isNaN(num) && num >= 1) {
                        onChange({ ...schedule, cycleDaysOn: num });
                      } else if (t === '') {
                        onChange({ ...schedule, cycleDaysOn: undefined });
                      }
                    }}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    style={[styles.cyclicalInput, { color: c.textPrimary }]}
                    placeholder="21"
                    placeholderTextColor={c.textTertiary}
                    maxLength={3}
                  />
                  <Text style={[styles.cyclicalLabel, { color: c.primary }]}>days ON</Text>
                </View>
                <IconSymbol name="arrow.right" size={16} color={c.textTertiary} />
                <View style={[styles.cyclicalInputWrap, { borderColor: c.error, backgroundColor: c.errorLight }]}>
                  <TextInput
                    value={schedule.cycleDaysOff?.toString() ?? ''}
                    onChangeText={(t) => {
                      const num = parseInt(t, 10);
                      if (!isNaN(num) && num >= 1) {
                        onChange({ ...schedule, cycleDaysOff: num });
                      } else if (t === '') {
                        onChange({ ...schedule, cycleDaysOff: undefined });
                      }
                    }}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    style={[styles.cyclicalInput, { color: c.textPrimary }]}
                    placeholder="7"
                    placeholderTextColor={c.textTertiary}
                    maxLength={3}
                  />
                  <Text style={[styles.cyclicalLabel, { color: c.error }]}>days OFF</Text>
                </View>
              </View>
              <Text style={[styles.cyclicalHint, { color: c.textTertiary }]}>
                Common: 21/7 (birth control), 14/14 (steroids), 5/2 (chemotherapy)
              </Text>
            </Card>
          </MotiView>
        )}
      </AnimatePresence>

      {/* ── Times (shown for daily, specific_days, weekly, monthly, cyclical, x_times_daily) ── */}
      <AnimatePresence>
        {needsTimes && (
          <MotiView
            key="times"
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -8 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Reminder times</Text>

            {/* Quick presets */}
            <View style={styles.presetsRow}>
              {TIME_PRESETS.map((p) => {
                const isAdded = schedule.times?.includes(p.time) ?? false;
                return (
                  <TouchableOpacity
                    key={p.time}
                    onPress={() => isAdded ? removeTime(p.time) : addPresetTime(p.time)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isAdded ? c.primaryLight : c.surface,
                          borderColor: isAdded ? c.primary : c.borderLight,
                          borderWidth: isAdded ? 2 : 1,
                        },
                      ]}
                    >
                      <IconSymbol
                        name={p.icon as any}
                        size={14}
                        color={isAdded ? c.primary : c.textTertiary}
                      />
                      <Text
                        style={[
                          styles.presetLabel,
                          { color: isAdded ? c.primary : c.textSecondary },
                        ]}
                      >
                        {p.label}
                      </Text>
                      <Text
                        style={[
                          styles.presetTime,
                          { color: isAdded ? c.primary : c.textTertiary },
                        ]}
                      >
                        {formatTime(p.time)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Current times */}
            <View style={styles.timeChips}>
              {(schedule.times ?? []).map((t) => (
                <Chip key={t} label={formatTime(t)} selected onPress={() => removeTime(t)} />
              ))}
            </View>

            <Button
              title="Custom Time"
              variant="secondary"
              size="sm"
              onPress={() => {
                setDraftTime(new Date());
                setShowTimePicker(true);
              }}
              icon={<IconSymbol name="plus" size={14} color={c.primary} />}
              style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}
            />

            {showTimePicker && (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={draftTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={addTime}
                  minuteInterval={5}
                />
                {Platform.OS === 'ios' && (
                  <View style={styles.pickerActions}>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)} activeOpacity={0.7}>
                      <Text style={[styles.pickerActionText, { color: c.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        commitTime(draftTime);
                        setShowTimePicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerActionText, { color: c.primary }]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </MotiView>
        )}
      </AnimatePresence>

      {/* ── Start date ── */}
      <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Start date</Text>
      <TouchableOpacity
        onPress={() => {
          setDraftStartDate(schedule.startDate ? new Date(schedule.startDate) : new Date());
          setShowDatePicker(true);
        }}
        activeOpacity={0.7}
      >
        <Card variant="filled" style={styles.dateCard}>
          <IconSymbol name="calendar" size={18} color={c.primary} />
          <Text style={[styles.dateText, { color: schedule.startDate ? c.textPrimary : c.textTertiary }]}>
            {schedule.startDate ?? 'Today (default)'}
          </Text>
        </Card>
      </TouchableOpacity>
      {showDatePicker && (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={Platform.OS === 'ios' ? draftStartDate : (schedule.startDate ? new Date(schedule.startDate) : new Date())}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleStartDateChange}
            minimumDate={new Date()}
          />
          {Platform.OS === 'ios' && (
            <View style={styles.pickerActions}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} activeOpacity={0.7}>
                <Text style={[styles.pickerActionText, { color: c.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  commitStartDate(draftStartDate);
                  setShowDatePicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerActionText, { color: c.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── As needed summary ── */}
      {schedule.frequency === 'as_needed' && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 200 }}
        >
          <Card variant="filled" style={styles.summaryCard}>
            <IconSymbol name="info.circle.fill" size={20} color={c.primary} />
            <Text style={[styles.summaryText, { color: c.textSecondary }]}>
              Take this medication as needed (PRN). No scheduled reminders will be set, but you can still track doses manually.
            </Text>
          </Card>
        </MotiView>
      )}
    </View>
  );
}

/** Generate evenly spaced times across waking hours (7AM - 10PM) */
function generateEvenTimes(count: number): string[] {
  if (count <= 0) return [];
  const startHour = 7; // 7 AM
  const endHour = 22; // 10 PM
  const span = endHour - startHour;
  const interval = span / count;
  const times: string[] = [];
  for (let i = 0; i < count; i++) {
    const h = Math.round(startHour + i * interval);
    times.push(`${String(h).padStart(2, '0')}:00`);
  }
  return times;
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
  frequencyGrid: {
    gap: spacing.xs,
  },
  freqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  freqTextWrap: {
    flex: 1,
  },
  freqLabel: {
    ...typography.sizes.subhead,
  },
  freqDesc: {
    ...typography.sizes.caption1,
    marginTop: 1,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayLabel: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },
  intervalCard: {
    padding: spacing.md,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  intervalText: {
    ...typography.sizes.body,
    fontWeight: '500',
  },
  intervalInput: {
    width: 56,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalTextInput: {
    ...typography.sizes.title3,
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  intervalHint: {
    ...typography.sizes.caption1,
    marginTop: spacing.xs,
  },
  timesPerDayRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timesPerDayChip: {
    width: 48,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timesPerDayText: {
    ...typography.sizes.headline,
    fontWeight: '700',
  },
  autoTimesHint: {
    ...typography.sizes.caption1,
    marginTop: spacing.xs,
  },
  cyclicalCard: {
    padding: spacing.md,
  },
  cyclicalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  cyclicalInputWrap: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    minWidth: 100,
  },
  cyclicalInput: {
    ...typography.sizes.title2,
    textAlign: 'center',
    fontWeight: '700',
    width: '100%',
    minWidth: 50,
  },
  cyclicalLabel: {
    ...typography.sizes.caption1,
    fontWeight: '600',
    marginTop: 2,
  },
  cyclicalHint: {
    ...typography.sizes.caption1,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    gap: 4,
  },
  presetLabel: {
    ...typography.sizes.caption1,
    fontWeight: '500',
  },
  presetTime: {
    ...typography.sizes.caption2,
  },
  timeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
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
  pickerWrap: {
    marginTop: spacing.sm,
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  pickerActionText: {
    ...typography.sizes.subhead,
    fontWeight: '600',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  summaryText: {
    ...typography.sizes.subhead,
    flex: 1,
  },
});
