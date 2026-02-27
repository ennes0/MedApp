/**
 * NextDoseCard — Hero card showing the next medication to take
 *
 * Three action buttons: Take (✓), Snooze (⏰), Skip (✕)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useColors } from '@/src/design-system/theme-provider';
import { Card } from '@/src/design-system/components/card';
import { Button } from '@/src/design-system/components/button';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { formatTime } from '@/src/lib/utils';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ScheduledDose } from '@/src/types/firebase';

interface NextDoseCardProps {
  dose: ScheduledDose;
  onTake: () => void;
  onSnooze: () => void;
  onSkip: () => void;
}

export function NextDoseCard({ dose, onTake, onSnooze, onSkip }: NextDoseCardProps) {
  const c = useColors();

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 18, stiffness: 200 }}
    >
      <Card variant="elevated" padding="lg" style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.label, { color: c.textSecondary }]}>
            NEXT DOSE
          </Text>
          <View style={styles.timeRow}>
            <IconSymbol name="clock.fill" size={14} color={c.primary} />
            <Text style={[styles.time, { color: c.primary }]}>
              {formatTime(dose.scheduledTime)}
            </Text>
          </View>
        </View>

        {/* Med info */}
        <View style={styles.medInfo}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: dose.medColor },
            ]}
          />
          <View style={styles.medText}>
            <Text style={[styles.medName, { color: c.textPrimary }]}>
              {dose.medName}
            </Text>
            <Text style={[styles.dosage, { color: c.textSecondary }]}>
              {dose.dosage} {dose.unit}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Take"
            onPress={onTake}
            variant="primary"
            size="md"
            icon={<IconSymbol name="checkmark" size={16} color="#FFFFFF" />}
            style={styles.actionBtn}
          />
          <Button
            title="Snooze"
            onPress={onSnooze}
            variant="secondary"
            size="md"
            icon={<IconSymbol name="clock.arrow.circlepath" size={16} color={c.primary} />}
            style={styles.actionBtn}
          />
          <Button
            title="Skip"
            onPress={onSkip}
            variant="ghost"
            size="md"
            icon={<IconSymbol name="xmark" size={16} color={c.primary} />}
            style={styles.actionBtn}
          />
        </View>
      </Card>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.sizes.caption1,
    fontWeight: '600',
    letterSpacing: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    ...typography.sizes.footnote,
    fontWeight: '600',
    ...typography.tabularNums,
  },
  medInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm + 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  medText: {
    flex: 1,
  },
  medName: {
    ...typography.sizes.title2,
    marginBottom: 2,
  },
  dosage: {
    ...typography.sizes.subhead,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
