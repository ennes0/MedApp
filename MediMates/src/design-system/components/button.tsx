/**
 * Button — Primary design system button
 *
 * Variants: primary, secondary, ghost, destructive
 * Sizes: sm, md, lg
 */

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useColors } from '../theme-provider';
import { spacing, radii, typography } from '../tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
  testID?: string;
}

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  md: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    minHeight: 44,
  },
  lg: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
};

const fontSizes: Record<ButtonSize, number> = {
  sm: typography.sizes.footnote.fontSize,
  md: typography.sizes.callout.fontSize,
  lg: typography.sizes.body.fontSize,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  fullWidth = false,
  testID,
}: ButtonProps) {
  const c = useColors();

  const variantStyles = getVariantStyles(variant, c);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      activeOpacity={0.7}
      style={[
        styles.base,
        sizeStyles[size],
        {
          backgroundColor: variantStyles.bg,
          borderColor: variantStyles.border,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.text}
          style={styles.loader}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              styles.label,
              {
                color: variantStyles.text,
                fontSize: fontSizes[size],
                marginLeft: icon ? spacing.sm : 0,
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function getVariantStyles(
  variant: ButtonVariant,
  c: ReturnType<typeof useColors>,
) {
  switch (variant) {
    case 'primary':
      return { bg: c.primary, text: '#FFFFFF', border: 'transparent' };
    case 'secondary':
      return { bg: 'transparent', text: c.primary, border: c.primary };
    case 'ghost':
      return { bg: 'transparent', text: c.primary, border: 'transparent' };
    case 'destructive':
      return { bg: c.error, text: '#FFFFFF', border: 'transparent' };
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.button,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  loader: {
    // Loader takes full space
  },
});
