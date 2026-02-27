/**
 * WeekDayPicker — Horizontal scrollable week day selector
 *
 * Shows a row of day circles (Mon–Sun) with the selected day
 * highlighted with the primary color fill.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import {
  addDays,
  format,
  isSameDay,
  startOfWeek,
} from 'date-fns';

const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WeekDayPickerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function WeekDayPicker({ selectedDate, onSelectDate }: WeekDayPickerProps) {
  const c = useColors();
  const scrollRef = useRef<ScrollView>(null);

  // Generate 7 days of the current week (Mon → Sun)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        const dayOfMonth = format(day, 'd');
        const dayLabel = SHORT_DAYS[days.indexOf(day)] ?? format(day, 'EEE');

        return (
          <TouchableOpacity
            key={day.toISOString()}
            activeOpacity={0.7}
            onPress={() => onSelectDate(day)}
            style={[
              styles.dayItem,
              isSelected && {
                backgroundColor: c.primary,
              },
              !isSelected && {
                backgroundColor: c.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.dayNumber,
                { color: isSelected ? '#FFFFFF' : c.textPrimary },
              ]}
            >
              {dayOfMonth}
            </Text>
            <Text
              style={[
                styles.dayLabel,
                { color: isSelected ? '#FFFFFF' : c.textSecondary },
              ]}
            >
              {dayLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm + 2,
  },
  dayItem: {
    width: 56,
    height: 72,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});
