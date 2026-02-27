/**
 * Chip — Pill-shaped selectable tag
 *
 * Variants: filled, outlined
 */

import React from 'react';
import { Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  interpolateColor,
} from 'react-native-reanimated';
import { PressableScale } from './pressable-scale';
import { useColors } from '../theme-provider';
import { spacing, radii, typography, motion } from '../tokens';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: 'filled' | 'outlined';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  selected = false,
  onPress,
  variant = 'filled',
  icon,
  style,
}: ChipProps) {
  const c = useColors();

  const bgColor = selected
    ? variant === 'filled'
      ? c.primary
      : c.primaryLight
    : variant === 'filled'
      ? c.surface
      : 'transparent';

  const textColor = selected
    ? variant === 'filled'
      ? '#FFFFFF'
      : c.primary
    : c.textSecondary;

  const borderColor = selected ? c.primary : c.border;

  return (
    <PressableScale onPress={onPress} style={style}>
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: bgColor,
            borderColor,
            borderWidth: variant === 'outlined' ? 1.5 : 0,
          },
        ]}
      >
        {icon && icon}
        <Text
          style={[
            styles.label,
            {
              color: textColor,
              marginLeft: icon ? spacing.xs : 0,
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    minHeight: 32,
  },
  label: {
    ...typography.sizes.footnote,
    fontWeight: '500',
  },
});
