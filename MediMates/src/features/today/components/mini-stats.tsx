/**
 * MiniStats — Today's adherence progress ring
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/src/design-system/theme-provider';
import { Card } from '@/src/design-system/components/card';
import { ProgressRing } from '@/src/design-system/components/progress-ring';
import { spacing, typography } from '@/src/design-system/tokens';
import { pluralize } from '@/src/lib/utils';

interface MiniStatsProps {
  takenCount: number;
  totalCount: number;
  adherence: number;
}

export function MiniStats({ takenCount, totalCount, adherence }: MiniStatsProps) {
  const c = useColors();

  return (
    <Card variant="filled" padding="md" style={styles.card}>
      <View style={styles.row}>
        <ProgressRing
          progress={adherence}
          size={56}
          strokeWidth={5}
          label={`${takenCount}/${totalCount}`}
          color={c.success}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: c.textPrimary }]}>
            Today's Progress
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {takenCount} of {totalCount} {pluralize(totalCount, 'dose')} taken
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.sizes.headline,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.sizes.footnote,
  },
});
