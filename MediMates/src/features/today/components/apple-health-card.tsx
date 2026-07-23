import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing } from '@/src/design-system/tokens';

interface AppleHealthCardProps {
  steps: number;
  activeCalories: number;
  sleepHours: number;
}

export function AppleHealthCard({
  steps,
  activeCalories,
  sleepHours,
}: AppleHealthCardProps) {
  const c = useColors();

  const stepsValue = Math.max(0, Math.round(steps));
  const caloriesValue = Math.max(0, Math.round(activeCalories));
  const sleepValue = Math.max(0, Math.round(sleepHours * 10) / 10);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.metricsGrid}>
          <MetricItem
            icon="figure.walk"
            value={String(stepsValue)}
            color="#3CBF9A"
            textColor={c.textPrimary}
          />
          <MetricItem
            icon="flame.fill"
            value={String(caloriesValue)}
            color="#FF5A1F"
            textColor={c.textPrimary}
          />
          <MetricItem
            icon="moon.stars.fill"
            value={sleepValue.toFixed(1)}
            color="#5E8DFF"
            textColor={c.textPrimary}
          />
        </View>
      </View>
    </View>
  );
}

function MetricItem({
  icon,
  value,
  color,
  textColor,
}: {
  icon: string;
  value: string;
  color: string;
  textColor: string;
}) {
  return (
    <View style={styles.metricItem}>
      <View style={styles.metricValueRow}>
        <IconSymbol name={icon as any} size={23} color={color} />
        <Text style={[styles.metricValue, { color: textColor }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  metricItem: {
    minWidth: 78,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricValue: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
