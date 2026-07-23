/**
 * MiniStats — Today's adherence progress ring
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/src/design-system/theme-provider';
import { Card } from '@/src/design-system/components/card';
import { ProgressRing } from '@/src/design-system/components/progress-ring';
import { spacing, typography } from '@/src/design-system/tokens';
import { useTranslation } from 'react-i18next';

interface MiniStatsProps {
  takenCount: number;
  totalCount: number;
  adherence: number;
}

export function MiniStats({ takenCount, totalCount, adherence }: MiniStatsProps) {
  const c = useColors();
  const { t } = useTranslation();

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
            {t('miniStats.title')}
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {t('miniStats.progress', { taken: takenCount, total: totalCount })}
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
