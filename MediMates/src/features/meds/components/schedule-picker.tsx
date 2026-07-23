/**
 * SchedulePicker — Reusable day & time selector for medication schedule.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TextInput, TouchableOpacity } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MotiView, AnimatePresence } from 'moti';
import { Chip } from '@/src/design-system/components/chip';
import { Button } from '@/src/design-system/components/button';
import { Card } from '@/src/design-system/components/card';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { DAY_LABELS, FREQUENCY_LABELS } from '../types';
import type { MedSchedule } from '@/src/types/firebase';
import { useTranslation } from 'react-i18next';

interface SchedulePickerProps {
  schedule: Partial<MedSchedule>;
  onChange: (schedule: Partial<MedSchedule>) => void;
}

export function SchedulePicker({ schedule, onChange }: SchedulePickerProps) {
  const c = useColors();
  const { t } = useTranslation();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [draftTime, setDraftTime] = useState(new Date());

  const handleFrequencyChange = (f: MedSchedule['frequency']) => {
    const updated: Partial<MedSchedule> = { ...schedule, frequency: f };
    if (f === 'daily') {
      delete updated.daysOfWeek;
      delete updated.intervalHours;
    }
    if (f === 'specific_days') {
      delete updated.intervalHours;
    }
    if (f === 'every_x_hours') {
      delete updated.daysOfWeek;
      updated.intervalHours = schedule.intervalHours ?? 8;
      updated.times = [];
    }
    if (f === 'as_needed') {
      delete updated.daysOfWeek;
      updated.times = [];
      delete updated.intervalHours;
    }
    onChange(updated);
  };

  const toggleDay = (day: number) => {
    const current = schedule.daysOfWeek ?? [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    onChange({ ...schedule, daysOfWeek: updated });
  };

  const commitTime = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    const times = [...(schedule.times ?? [])];
    if (!times.includes(timeStr)) {
      times.push(timeStr);
      times.sort();
    }
    onChange({ ...schedule, times });
  };

  const addTime = (event: DateTimePickerEvent, date?: Date) => {
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
  };

  const removeTime = (t: string) => {
    const times = (schedule.times ?? []).filter((x) => x !== t);
    onChange({ ...schedule, times });
  };

  const handleIntervalChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 1 && num <= 24) {
      onChange({ ...schedule, intervalHours: num });
    } else if (text === '') {
      onChange({ ...schedule, intervalHours: undefined });
    }
  };

  return (
    <View style={styles.container}>
      {/* Frequency */}
      <Text style={[styles.label, { color: c.textPrimary }]}>{t('schedulePicker.frequency')}</Text>
      <View style={styles.chips}>
        {(Object.keys(FREQUENCY_LABELS) as MedSchedule['frequency'][]).map((f) => (
          <Chip
            key={f}
            label={FREQUENCY_LABELS[f]}
            selected={schedule.frequency === f}
            onPress={() => handleFrequencyChange(f)}
          />
        ))}
      </View>

      {/* Days (only for specific_days) */}
      <AnimatePresence>
        {schedule.frequency === 'specific_days' && (
          <MotiView
            key="days"
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -8 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Text style={[styles.label, { color: c.textPrimary }]}>{t('schedulePicker.days')}</Text>
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, idx) => {
                const isSelected = schedule.daysOfWeek?.includes(idx) ?? false;
                return (
                  <View key={idx} style={[styles.dayCircle]}>
                    <Chip
                      label={label}
                      selected={isSelected}
                      onPress={() => toggleDay(idx)}
                    />
                  </View>
                );
              })}
            </View>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Interval hours (only for every_x_hours) */}
      <AnimatePresence>
        {schedule.frequency === 'every_x_hours' && (
          <MotiView
            key="interval"
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -8 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Text style={[styles.label, { color: c.textPrimary }]}>
              {t('schedulePicker.everyHowManyHours')}
            </Text>
            <Card variant="filled" style={styles.intervalCard}>
              <View style={styles.intervalRow}>
                <Text style={[styles.intervalText, { color: c.textSecondary }]}>
                  {t('schedulePicker.every')}
                </Text>
                <View style={[styles.intervalInput, { backgroundColor: c.background, borderColor: c.border }]}>
                  <TextInput
                    value={schedule.intervalHours?.toString() ?? ''}
                    onChangeText={handleIntervalChange}
                    keyboardType="number-pad"
                    style={[styles.intervalTextInput, { color: c.textPrimary }]}
                    placeholder="8"
                    placeholderTextColor={c.textTertiary}
                    maxLength={2}
                  />
                </View>
                <Text style={[styles.intervalText, { color: c.textSecondary }]}>
                  {t('schedulePicker.hours')}
                </Text>
              </View>
              <Text style={[styles.intervalHint, { color: c.textTertiary }]}>
                {t('schedulePicker.intervalHint')}
              </Text>
            </Card>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Times (for daily and specific_days) */}
      <AnimatePresence>
        {schedule.frequency !== 'as_needed' && schedule.frequency !== 'every_x_hours' && (
          <MotiView
            key="times"
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -8 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Text style={[styles.label, { color: c.textPrimary }]}>{t('schedulePicker.reminderTimes')}</Text>
            <View style={styles.timeChips}>
              {(schedule.times ?? []).map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected
                  onPress={() => removeTime(t)}
                />
              ))}
            </View>

            <Button
              title={t('schedulePicker.addTime')}
              variant="secondary"
              size="sm"
              onPress={() => {
                setDraftTime(new Date());
                setShowTimePicker(true);
              }}
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
                      <Text style={[styles.pickerActionText, { color: c.textSecondary }]}>{t('profile.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        commitTime(draftTime);
                        setShowTimePicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerActionText, { color: c.primary }]}>{t('addMedSteps.schedule.done')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </MotiView>
        )}
      </AnimatePresence>

      {/* Summary */}
      {schedule.frequency === 'as_needed' && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 200 }}
        >
          <Card variant="filled" style={styles.summaryCard}>
            <Text style={[styles.summaryText, { color: c.textSecondary }]}>
              {t('schedulePicker.asNeededSummary')}
            </Text>
          </Card>
        </MotiView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  label: {
    ...typography.sizes.subhead,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayCircle: {
    borderRadius: radii.full,
  },
  timeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
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
  summaryCard: {
    padding: spacing.md,
  },
  pickerWrap: {
    marginTop: spacing.sm,
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  pickerActionText: {
    ...typography.sizes.subhead,
    fontWeight: '600',
  },
  summaryText: {
    ...typography.sizes.body,
    textAlign: 'center',
  },
});
