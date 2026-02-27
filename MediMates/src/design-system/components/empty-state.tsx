/**
 * EmptyState — Centered placeholder for empty lists
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../theme-provider';
import { spacing, typography } from '../tokens';
import { Button } from './button';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const c = useColors();

  return (
    <View style={styles.container}>
      {icon && (
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: c.primaryLight },
          ]}
        >
          <IconSymbol
            name={icon as any}
            size={40}
            color={c.primary}
          />
        </View>
      )}
      <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.sizes.title3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.sizes.subhead,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.lg,
  },
});
