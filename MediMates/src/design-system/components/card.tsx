/**
 * Card — Surface container
 *
 * Variants: elevated (shadow), outlined (border), filled (surface bg)
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useColors } from '../theme-provider';
import { spacing, radii, shadows } from '../tokens';

type CardVariant = 'elevated' | 'outlined' | 'filled';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof spacing;
  testID?: string;
}

export function Card({
  children,
  variant = 'elevated',
  style,
  padding = 'md',
  testID,
}: CardProps) {
  const c = useColors();

  const variantStyle = getVariantStyle(variant, c);

  return (
    <View
      testID={testID}
      style={[
        styles.base,
        { padding: spacing[padding] },
        variantStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function getVariantStyle(
  variant: CardVariant,
  c: ReturnType<typeof useColors>,
): ViewStyle {
  switch (variant) {
    case 'elevated':
      return {
        backgroundColor: c.card,
        ...shadows.md,
      };
    case 'outlined':
      return {
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.border,
      };
    case 'filled':
      return {
        backgroundColor: c.surface,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.card,
    overflow: 'hidden',
  },
});
