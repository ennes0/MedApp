/**
 * ListItem — Settings-style row with leading icon, title, subtitle, trailing accessory
 *
 * Supports stagger enter animation via index prop.
 */

import React from 'react';
import { View, Text, StyleSheet, Switch, type StyleProp, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { useColors } from '../theme-provider';
import { spacing, radii, typography, motion } from '../tokens';
import { PressableScale } from './pressable-scale';
import { IconSymbol } from '@/components/ui/icon-symbol';

type TrailingAccessory =
  | { type: 'chevron' }
  | { type: 'switch'; value: boolean; onValueChange: (v: boolean) => void }
  | { type: 'badge'; count: number }
  | { type: 'text'; text: string }
  | { type: 'custom'; element: React.ReactNode };

interface ListItemProps {
  title: string;
  subtitle?: string;
  leadingIcon?: string;
  leadingIconColor?: string;
  trailing?: TrailingAccessory;
  onPress?: () => void;
  destructive?: boolean;
  /** Index for stagger animation */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

export function ListItem({
  title,
  subtitle,
  leadingIcon,
  leadingIconColor,
  trailing,
  onPress,
  destructive = false,
  index = 0,
  style,
}: ListItemProps) {
  const c = useColors();

  const content = (
    <MotiView
      from={{ opacity: 0, translateX: -8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{
        type: 'timing',
        duration: motion.durations.card,
        delay: index * 50,
      }}
      style={[styles.row, style]}
    >
      {leadingIcon && (
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: leadingIconColor
                ? `${leadingIconColor}20`
                : c.primaryLight,
            },
          ]}
        >
          <IconSymbol
            name={leadingIcon as any}
            size={18}
            color={leadingIconColor ?? c.primary}
          />
        </View>
      )}

      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            { color: destructive ? c.error : c.textPrimary },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>

      {trailing && renderTrailing(trailing, c)}
    </MotiView>
  );

  if (onPress && trailing?.type !== 'switch') {
    return <PressableScale onPress={onPress}>{content}</PressableScale>;
  }

  return content;
}

function renderTrailing(trailing: TrailingAccessory, c: any) {
  switch (trailing.type) {
    case 'chevron':
      return (
        <IconSymbol
          name="chevron.right"
          size={14}
          color={c.textTertiary}
          style={{ marginLeft: spacing.sm }}
        />
      );
    case 'switch':
      return (
        <Switch
          value={trailing.value}
          onValueChange={trailing.onValueChange}
          trackColor={{ false: c.border, true: c.primary }}
        />
      );
    case 'badge':
      return (
        <View
          style={[
            styles.badge,
            { backgroundColor: c.error },
          ]}
        >
          <Text style={styles.badgeText}>{trailing.count}</Text>
        </View>
      );
    case 'text':
      return (
        <Text style={[styles.trailingText, { color: c.textTertiary }]}>
          {trailing.text}
        </Text>
      );
    case 'custom':
      return <>{trailing.element}</>;
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.sizes.body,
  },
  subtitle: {
    ...typography.sizes.caption1,
    marginTop: 2,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: spacing.sm,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  trailingText: {
    ...typography.sizes.subhead,
    marginLeft: spacing.sm,
  },
});
