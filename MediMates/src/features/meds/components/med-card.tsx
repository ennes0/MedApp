/**
 * MedCard — Modern medication list item card
 *
 * Rounded card with med-colored accent, pill icon, schedule info,
 * and animated paused badge. Clean iOS-style layout.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { formatTime } from '@/src/lib/utils';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FREQUENCY_LABELS, ICON_FOR_FORM, MEDICATION_FORMS } from '../types';
import type { Medication, MedicationForm } from '@/src/types/firebase';

interface MedCardProps {
  med: Medication;
  onPress: () => void;
  index?: number;
}

export function MedCard({ med, onPress, index = 0 }: MedCardProps) {
  const c = useColors();

  const timesPerDay =
    med.schedule.frequency === 'every_x_hours' && med.schedule.intervalHours
      ? Math.floor(14 / med.schedule.intervalHours) + 1
      : med.schedule.times?.length || 0;

  const scheduleLabel =
    med.schedule.frequency === 'as_needed'
      ? 'As needed'
      : med.schedule.times?.length > 0
        ? med.schedule.times.map(formatTime).join(' · ')
        : FREQUENCY_LABELS[med.schedule.frequency];

  const freqSuffix =
    med.schedule.frequency !== 'as_needed' && timesPerDay > 0
      ? `${timesPerDay}x daily`
      : null;

  // Use form-specific icon or fall back to pill.fill
  const iconName = med.form
    ? ICON_FOR_FORM[med.form as MedicationForm] ?? 'pill.fill'
    : 'pill.fill';

  // Form label for subtitle
  const formLabel =
    med.form
      ? MEDICATION_FORMS.find((f) => f.id === med.form)?.label
      : undefined;

  return (
    <PressableScale onPress={onPress}>
      <View style={[styles.card, { backgroundColor: c.card }]}>
        {/* Left color accent */}
        <View style={[styles.accent, { backgroundColor: med.color }]} />

        {/* Icon */}
        <View style={[styles.iconBox, { backgroundColor: `${med.color}14` }]}>
          <IconSymbol name={iconName} size={26} color={med.color} />
        </View>

        {/* Content */}
        <View style={styles.body}>
          {/* Row 1: Name + badge */}
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: c.textPrimary }]}
              numberOfLines={1}
            >
              {med.name}
            </Text>
            {med.paused && (
              <View style={[styles.pausedBadge, { backgroundColor: c.warningLight }]}>
                <Text style={[styles.pausedText, { color: c.warning }]}>
                  Paused
                </Text>
              </View>
            )}
          </View>

          {/* Row 2: Dosage · form · frequency */}
          <Text style={[styles.dosage, { color: c.textSecondary }]} numberOfLines={1}>
            {med.dosage} {med.unit}
            {med.doseQuantity && med.doseQuantity !== 1 ? ` × ${med.doseQuantity}` : ''}
            {formLabel ? ` · ${formLabel}` : ''}
            {freqSuffix ? ` · ${freqSuffix}` : ''}
          </Text>

          {/* Row 3: Schedule times + bell */}
          <View style={styles.metaRow}>
            <View style={styles.scheduleTag}>
              <IconSymbol name="clock.fill" size={12} color={c.primary} />
              <Text
                style={[styles.scheduleText, { color: c.textTertiary }]}
                numberOfLines={1}
              >
                {scheduleLabel}
              </Text>
            </View>

            {med.reminderEnabled && (
              <View style={[styles.bellDot, { backgroundColor: c.primaryLight }]}>
                <IconSymbol name="bell.fill" size={10} color={c.primary} />
              </View>
            )}
          </View>
        </View>

        {/* Chevron */}
        <IconSymbol
          name="chevron.right"
          size={14}
          color={c.textTertiary}
          style={styles.chevron}
        />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + 4,
    minHeight: 96,
    ...shadows.sm,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm + 4,
  },
  body: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    paddingLeft: spacing.sm + 4,
    paddingRight: spacing.xs,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.sizes.headline,
    flex: 1,
  },
  pausedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  pausedText: {
    ...typography.sizes.caption2,
    fontWeight: '600',
  },
  dosage: {
    ...typography.sizes.subhead,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  scheduleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  scheduleText: {
    ...typography.sizes.caption1,
    fontWeight: '500',
    flex: 1,
  },
  bellDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    marginRight: spacing.md,
  },
});
