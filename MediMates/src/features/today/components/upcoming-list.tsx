/**
 * UpcomingList — Remaining doses for today
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useColors } from '@/src/design-system/theme-provider';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { spacing, typography, radii, motion } from '@/src/design-system/tokens';
import { formatTime } from '@/src/lib/utils';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ScheduledDose } from '@/src/types/firebase';

interface UpcomingListProps {
  doses: ScheduledDose[];
  onPressDose: (dose: ScheduledDose) => void;
}

export function UpcomingList({ doses, onPressDose }: UpcomingListProps) {
  const c = useColors();

  if (doses.length === 0) return null;

  return (
    <View style={styles.container}>
      {doses.map((dose, index) => (
        <MotiView
          key={`${dose.medId}-${dose.scheduledTime}`}
          from={{ opacity: 0, translateX: -12 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{
            type: 'timing',
            duration: motion.durations.card,
            delay: index * 60,
          }}
        >
          <PressableScale onPress={() => onPressDose(dose)}>
            <View
              style={[
                styles.row,
                {
                  backgroundColor: c.card,
                  borderBottomColor: c.separator,
                  borderBottomWidth:
                    index < doses.length - 1 ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: dose.medColor },
                ]}
              />
              <View style={styles.info}>
                <Text style={[styles.name, { color: c.textPrimary }]}>
                  {dose.medName}
                </Text>
                <Text style={[styles.dosage, { color: c.textSecondary }]}>
                  {dose.dosage} {dose.unit}
                </Text>
              </View>
              <View style={styles.timeContainer}>
                <Text style={[styles.time, { color: c.textTertiary }]}>
                  {formatTime(dose.scheduledTime)}
                </Text>
                <IconSymbol
                  name="chevron.right"
                  size={12}
                  color={c.textTertiary}
                />
              </View>
            </View>
          </PressableScale>
        </MotiView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm + 4,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.sizes.body,
    fontWeight: '500',
  },
  dosage: {
    ...typography.sizes.caption1,
    marginTop: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  time: {
    ...typography.sizes.footnote,
    ...typography.tabularNums,
    fontWeight: '500',
  },
});
