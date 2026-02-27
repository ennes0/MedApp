/**
 * SectionHeader — Section title with optional action link
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressableScale } from './pressable-scale';
import { useColors } from '../theme-provider';
import { spacing, typography } from '../tokens';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  const c = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
      {action && onAction && (
        <PressableScale onPress={onAction}>
          <Text style={[styles.action, { color: c.primary }]}>{action}</Text>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    ...typography.sizes.title3,
  },
  action: {
    ...typography.sizes.subhead,
    fontWeight: '500',
  },
});
