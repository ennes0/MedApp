/**
 * DoseListCard — Medication dose card for the Today screen
 *
 * Rounded card with pill icon on the left, dosage info in the middle,
 * scheduled time row, and an animated status indicator on the right.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { formatTime } from '@/src/lib/utils';
import type { ScheduledDose, DoseStatus } from '@/src/types/firebase';

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

  return (
    <PressableScale onPress={onPress}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: c.surface,
            opacity: isDone ? 0.7 : 1,
          },
        ]}
      >
        {/* Pill icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${dose.medColor}18` },
          ]}
        >
          <IconSymbol
            name="pill.fill"
            size={28}
            color={dose.medColor}
          />
        </View>

        {/* Text info */}
        <View style={styles.textContainer}>
          <Text style={[styles.instruction, { color: c.textSecondary }]}>
            {instruction}
          </Text>
          <Text
            style={[
              styles.medName,
              { color: c.textPrimary },
              isDone && styles.medNameDone,
            ]}
          >
            {dose.medName}, {dose.dosage}{dose.unit}
          </Text>
          <View style={styles.timeRow}>
            <IconSymbol name="clock.fill" size={14} color={c.textTertiary} />
            <Text style={[styles.timeText, { color: c.textTertiary }]}>
              {formatTime(dose.scheduledTime)}
            </Text>
          </View>
        </View>

        {/* Status indicator */}
        {statusCfg ? (
          <MotiView
            from={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 180 }}
            style={styles.statusWrap}
          >
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusCfg.bg },
              ]}
            >
              <IconSymbol
                name={statusCfg.icon}
                size={20}
                color={statusCfg.fg}
              />
            </View>
            <Text style={[styles.statusLabel, { color: statusCfg.fg }]}>
              {statusCfg.label}
            </Text>
          </MotiView>
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
    borderRadius: radii.card,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm + 2,
    gap: spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  instruction: {
    ...typography.sizes.caption1,
    fontWeight: '500',
  },
  medName: {
    ...typography.sizes.headline,
  },
  medNameDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
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
    minWidth: 44,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    ...typography.sizes.caption2,
    fontWeight: '600',
  },
});
