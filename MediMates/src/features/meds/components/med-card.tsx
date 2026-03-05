/**
 * MedCard — Credit-card-style medication card
 *
 * Full-width bold card with the med's color as background.
 * Layout inspired by modern banking/debit card designs:
 * - Top row: form icon + form label (left) · status badge (right)
 * - Middle: large medication name + masked-dot dosage display
 * - Bottom left: large dosage amount like a "balance"
 * - Bottom right: schedule/time info like a "valid thru"
 * - Extra detail row with reminder bell, meal relation, notes indicator
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { formatTime } from '@/src/lib/utils';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FREQUENCY_LABELS, ICON_FOR_FORM, IMAGE_FOR_FORM, MEDICATION_FORMS, MEAL_RELATION_OPTIONS } from '../types';
import { isTreatmentExpired } from '@/src/lib/utils';
import type { Medication, MedicationForm } from '@/src/types/firebase';

interface MedCardProps {
  med: Medication;
  onPress: () => void;
  index?: number;
}

/** Darken a hex color by a given amount (0-1) */
function darkenColor(hex: string, amount: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgb(${clamp(Math.round(r * (1 - amount)))}, ${clamp(Math.round(g * (1 - amount)))}, ${clamp(Math.round(b * (1 - amount)))})`;
}

/** Determine if a color is light or dark to pick contrasting text */
function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55;
}

export function MedCard({ med, onPress, index = 0 }: MedCardProps) {
  const c = useColors();

  const light = isLightColor(med.color);
  const textColor = light ? '#1A1A2E' : '#FFFFFF';
  const subtextColor = light ? 'rgba(26,26,46,0.6)' : 'rgba(255,255,255,0.7)';
  const chipBg = light ? 'rgba(26,26,46,0.08)' : 'rgba(255,255,255,0.15)';
  const dividerColor = light ? 'rgba(26,26,46,0.08)' : 'rgba(255,255,255,0.12)';

  const gradientEnd = darkenColor(med.color, 0.18);

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

  // Form icon & label
  const iconName = med.form
    ? ICON_FOR_FORM[med.form as MedicationForm] ?? 'pill.fill'
    : 'pill.fill';
  const formImage = med.form
    ? IMAGE_FOR_FORM[med.form as MedicationForm]
    : undefined;
  const formLabel =
    med.form
      ? MEDICATION_FORMS.find((f) => f.id === med.form)?.label ?? 'Medication'
      : 'Medication';

  // Meal relation label
  const mealLabel = med.mealRelation
    ? MEAL_RELATION_OPTIONS.find((m) => m.id === med.mealRelation)?.label
    : undefined;

  // Check if treatment has expired
  const expired = isTreatmentExpired(med);

  // Duration/treatment info
  const durationLabel = (() => {
    const d = med.treatmentDuration;
    if (!d) return undefined;
    if (d.type === 'ongoing') return 'Ongoing';
    if (expired) return 'Ended';
    if (d.endDate) return `Until ${d.endDate}`;
    if (d.value) return `${d.value} ${d.type.replace('specific_', '')}`;
    return undefined;
  })();

  // Build dosage display — e.g. "500 mg × 2"
  const dosageDisplay = `${med.dosage} ${med.unit}${
    med.doseQuantity && med.doseQuantity !== 1 ? ` × ${med.doseQuantity}` : ''
  }`;

  return (
    <PressableScale onPress={onPress} style={styles.wrapper}>
      <LinearGradient
        colors={[med.color, gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* ── Top Row: Icon + Form label (left) · Status badge (right) ── */}
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <View style={[styles.formIconCircle, { backgroundColor: chipBg }]}>
              {formImage ? (
                <Image source={formImage} style={styles.formIconImage} resizeMode="contain" />
              ) : (
                <IconSymbol name={iconName} size={20} color={textColor} />
              )}
            </View>
            <Text style={[styles.formLabel, { color: textColor }]}>
              {formLabel}
            </Text>
          </View>
          <View style={styles.topRight}>
            {expired && (
              <View style={[styles.statusBadge, styles.expiredBadge]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#FFFFFF" />
                <Text style={[styles.statusText, { color: '#FFFFFF' }]}>Ended</Text>
              </View>
            )}
            {!expired && med.paused && (
              <View style={[styles.statusBadge, { backgroundColor: chipBg }]}>
                <IconSymbol name="pause.circle.fill" size={12} color={textColor} />
                <Text style={[styles.statusText, { color: textColor }]}>Paused</Text>
              </View>
            )}
            {!expired && !med.paused && (
              <View style={[styles.statusBadge, { backgroundColor: chipBg }]}>
                <View style={[styles.activeDot, { backgroundColor: textColor }]} />
                <Text style={[styles.statusText, { color: textColor }]}>Active</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Medication Name ── */}
        <Text style={[styles.medName, { color: textColor }]} numberOfLines={2}>
          {med.name}
        </Text>

        {/* ── Dosage (big, prominent — like a balance) ── */}
        <Text style={[styles.dosageBig, { color: textColor }]} numberOfLines={1}>
          {dosageDisplay}
        </Text>

        {/* ── Divider ── */}
        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        {/* ── Bottom Detail Row ── */}
        <View style={styles.bottomRow}>
          {/* Left: Schedule */}
          <View style={styles.bottomSection}>
            <Text style={[styles.bottomLabel, { color: subtextColor }]}>Schedule</Text>
            <View style={styles.scheduleRow}>
              <IconSymbol name="clock.fill" size={13} color={textColor} />
              <Text style={[styles.bottomValue, { color: textColor }]} numberOfLines={1}>
                {scheduleLabel}
              </Text>
            </View>
            {freqSuffix && (
              <Text style={[styles.bottomSub, { color: subtextColor }]}>{freqSuffix}</Text>
            )}
          </View>

          {/* Right: Extra info column */}
          <View style={[styles.bottomSection, styles.bottomRight]}>
            {durationLabel && (
              <>
                <Text style={[styles.bottomLabel, { color: subtextColor }]}>Duration</Text>
                <Text style={[styles.bottomValue, { color: textColor }]} numberOfLines={1}>
                  {durationLabel}
                </Text>
              </>
            )}
            {!durationLabel && mealLabel && (
              <>
                <Text style={[styles.bottomLabel, { color: subtextColor }]}>Timing</Text>
                <Text style={[styles.bottomValue, { color: textColor }]} numberOfLines={1}>
                  {mealLabel}
                </Text>
              </>
            )}
            {!durationLabel && !mealLabel && med.route && (
              <>
                <Text style={[styles.bottomLabel, { color: subtextColor }]}>Route</Text>
                <Text style={[styles.bottomValue, { color: textColor, textTransform: 'capitalize' }]} numberOfLines={1}>
                  {med.route}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ── Chips Row (reminder, meal, notes, refill) ── */}
        <View style={styles.chipsRow}>
          {med.reminderEnabled && (
            <View style={[styles.chip, { backgroundColor: chipBg }]}>
              <IconSymbol name="bell.fill" size={11} color={textColor} />
              <Text style={[styles.chipText, { color: textColor }]}>Reminder</Text>
            </View>
          )}
          {mealLabel && durationLabel && (
            <View style={[styles.chip, { backgroundColor: chipBg }]}>
              <IconSymbol name="fork.knife.circle.fill" size={11} color={textColor} />
              <Text style={[styles.chipText, { color: textColor }]}>{mealLabel}</Text>
            </View>
          )}
          {med.refill?.enabled && (
            <View style={[styles.chip, { backgroundColor: chipBg }]}>
              <IconSymbol name="arrow.triangle.2.circlepath" size={11} color={textColor} />
              <Text style={[styles.chipText, { color: textColor }]}>
                {med.refill.currentStock != null ? `${med.refill.currentStock} left` : 'Refill'}
              </Text>
            </View>
          )}
          {med.notes?.length > 0 && (
            <View style={[styles.chip, { backgroundColor: chipBg }]}>
              <IconSymbol name="note.text" size={11} color={textColor} />
              <Text style={[styles.chipText, { color: textColor }]}>Notes</Text>
            </View>
          )}
        </View>

        {/* ── Decorative circles (card texture) ── */}
        <View style={[styles.decoCircle, styles.decoTopRight, { borderColor: dividerColor }]} />
        <View style={[styles.decoCircle, styles.decoBottomLeft, { borderColor: dividerColor }]} />

        {/* ── Corner exclamation for expired treatment ── */}
        {expired && (
          <View style={styles.expiredCorner}>
            <IconSymbol name="exclamationmark.circle.fill" size={24} color="#FF3B30" />
          </View>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radii.lg + 4,
    padding: spacing.lg,
    minHeight: 220,
    overflow: 'hidden',
    ...shadows.lg,
  },

  // ── Top row ──
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  formIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formIconImage: {
    width: 22,
    height: 22,
  },
  formLabel: {
    ...typography.sizes.subhead,
    fontWeight: '600',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statusText: {
    ...typography.sizes.caption1,
    fontWeight: '700',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ── Name ──
  medName: {
    ...typography.sizes.title1,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  // ── Dosage ──
  dosageBig: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: spacing.md,
    opacity: 0.85,
  },

  // ── Divider ──
  divider: {
    height: 1,
    marginBottom: spacing.md,
  },

  // ── Bottom detail row ──
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 4,
  },
  bottomSection: {
    flex: 1,
    gap: 2,
  },
  bottomRight: {
    alignItems: 'flex-end',
  },
  bottomLabel: {
    ...typography.sizes.caption2,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bottomValue: {
    ...typography.sizes.subhead,
    fontWeight: '700',
  },
  bottomSub: {
    ...typography.sizes.caption1,
    fontWeight: '500',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // ── Chips ──
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  chipText: {
    ...typography.sizes.caption2,
    fontWeight: '600',
  },

  // ── Deco ──
  decoCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
  },
  decoTopRight: {
    top: -40,
    right: -30,
  },
  decoBottomLeft: {
    bottom: -50,
    left: -40,
  },

  // ── Expired treatment ──
  expiredBadge: {
    backgroundColor: '#FF3B30',
  },
  expiredCorner: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});
