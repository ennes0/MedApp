/**
 * DoseListCard — Modern medication dose card for the Today screen
 *
 * Large card with colored left accent, pill icon, dosage info,
 * scheduled time, and status indicator. No heavy animations.
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { formatTime } from '@/src/lib/utils';
import { IMAGE_FOR_FORM } from '@/src/features/meds/types';
import type { ScheduledDose, DoseStatus, MedicationForm } from '@/src/types/firebase';

interface DoseListCardProps {
  dose: ScheduledDose;
  onPress: () => void;
}

/** Generate a short instruction label from dose data */
function getInstruction(dose: ScheduledDose): string {
  const qty = dose.dosage;
  const unitLower = dose.unit.toLowerCase();
  let form = 'pill';
  if (unitLower === 'ml') form = 'spoon';
  else if (unitLower === 'drop' || unitLower === 'drops') form = 'drop';
  else if (unitLower === 'puff' || unitLower === 'puffs') form = 'puff';
  else if (unitLower === 'capsule' || unitLower === 'capsules') form = 'capsule';
  else if (unitLower === 'tablet' || unitLower === 'tablets') form = 'pill';

  return `${qty} ${form}`;
}

/** Status indicator config */
function getStatusConfig(
  status: DoseStatus,
  colors: ReturnType<typeof useColors>,
) {
  switch (status) {
    case 'taken':
      return {
        icon: 'checkmark.circle.fill' as const,
        bg: colors.successLight,
        fg: colors.success,
        label: 'Taken',
      };
    case 'skipped':
      return {
        icon: 'xmark.circle.fill' as const,
        bg: colors.warningLight,
        fg: colors.warning,
        label: 'Skipped',
      };
    case 'snoozed':
      return {
        icon: 'clock.badge' as const,
        bg: colors.primaryLight,
        fg: colors.primary,
        label: 'Snoozed',
      };
    default:
      return null;
  }
}

export function DoseListCard({ dose, onPress }: DoseListCardProps) {
  const c = useColors();

  const instruction = getInstruction(dose);
  const statusCfg = getStatusConfig(dose.status, c);
  const isDone = dose.status === 'taken' || dose.status === 'skipped';
  const formImage = dose.medForm ? IMAGE_FOR_FORM[dose.medForm] : undefined;

  return (
    <PressableScale onPress={onPress}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: c.card,
            opacity: isDone ? 0.65 : 1,
          },
        ]}
      >
        {/* Left color accent */}
        <View style={[styles.accent, { backgroundColor: dose.medColor }]} />

        {/* Pill icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${dose.medColor}18` },
          ]}
        >
          {formImage ? (
            <Image source={formImage} style={styles.formIconImage} resizeMode="contain" />
          ) : (
            <IconSymbol
              name="pill.fill"
              size={28}
              color={dose.medColor}
            />
          )}
        </View>

        {/* Text info */}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.medName,
              { color: c.textPrimary },
              isDone && styles.medNameDone,
            ]}
            numberOfLines={1}
          >
            {dose.medName}
          </Text>
          <Text style={[styles.dosageText, { color: c.textSecondary }]} numberOfLines={1}>
            {dose.dosage} {dose.unit}
          </Text>
          <View style={styles.timeRow}>
            <IconSymbol name="clock.fill" size={13} color={c.textTertiary} />
            <Text style={[styles.timeText, { color: c.textTertiary }]}>
              {formatTime(dose.scheduledTime)}
            </Text>
          </View>
        </View>

        {/* Status indicator */}
        {statusCfg ? (
          <View style={styles.statusWrap}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusCfg.bg },
              ]}
            >
              <IconSymbol
                name={statusCfg.icon}
                size={22}
                color={statusCfg.fg}
              />
            </View>
            <Text style={[styles.statusLabel, { color: statusCfg.fg }]}>
              {statusCfg.label}
            </Text>
          </View>
        ) : (
          /* Pending — subtle chevron */
          <IconSymbol
            name="chevron.right"
            size={14}
            color={c.textTertiary}
          />
        )}
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
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm + 4,
    minHeight: 88,
    ...shadows.sm,
  },
  accent: {
    width: 5,
    alignSelf: 'stretch',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm + 4,
  },
  formIconImage: {
    width: 32,
    height: 32,
  },
  textContainer: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingLeft: spacing.sm + 4,
    paddingRight: spacing.xs,
    gap: 3,
  },
  medName: {
    ...typography.sizes.headline,
  },
  medNameDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  dosageText: {
    ...typography.sizes.subhead,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    ...typography.sizes.caption1,
    fontWeight: '500',
  },

  /* Status indicator */
  statusWrap: {
    alignItems: 'center',
    gap: 3,
    minWidth: 48,
    marginRight: spacing.md,
  },
  statusBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    ...typography.sizes.caption2,
    fontWeight: '600',
  },
});
