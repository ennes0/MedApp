/**
 * AppTextInput — Styled text input with label + error
 *
 * Integrates with react-hook-form via Controller pattern.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useColors } from '../theme-provider';
import { spacing, radii, typography, motion } from '../tokens';

interface AppTextInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function AppTextInput({
  label,
  error,
  hint,
  containerStyle,
  value,
  onFocus,
  onBlur,
  ...rest
}: AppTextInputProps) {
  const c = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const focus = useSharedValue(0);

  const hasValue = !!value && value.length > 0;

  const handleFocus = useCallback(
    (e: any) => {
      setIsFocused(true);
      focus.value = withTiming(1, motion.timing.micro);
      onFocus?.(e);
    },
    [focus, onFocus],
  );

  const handleBlur = useCallback(
    (e: any) => {
      setIsFocused(false);
      if (!hasValue) {
        focus.value = withTiming(0, motion.timing.micro);
      }
      onBlur?.(e);
    },
    [focus, hasValue, onBlur],
  );

  const labelAnimStyle = useAnimatedStyle(() => {
    const translateY = interpolate(focus.value, [0, 1], [0, -24]);
    const scale = interpolate(focus.value, [0, 1], [1, 0.8]);
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  const borderColor = error
    ? c.error
    : isFocused
      ? c.primary
      : c.border;

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.inputContainer,
          {
            borderColor,
            backgroundColor: c.surface,
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.floatingLabel,
            {
              color: error ? c.error : c.textTertiary,
            },
            (isFocused || hasValue) ? labelAnimStyle : undefined,
          ]}
          pointerEvents="none"
        >
          {label}
        </Animated.Text>

        <TextInput
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={c.textTertiary}
          selectionColor={c.primary}
          style={[
            styles.input,
            {
              color: c.textPrimary,
              paddingTop: isFocused || hasValue ? 20 : spacing.sm + 4,
            },
          ]}
          {...rest}
        />
      </View>

      {(error || hint) && (
        <Text
          style={[
            styles.helperText,
            { color: error ? c.error : c.textTertiary },
          ]}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  floatingLabel: {
    position: 'absolute',
    left: spacing.md,
    top: 17,
    ...typography.sizes.body,
  },
  input: {
    ...typography.sizes.body,
    paddingBottom: spacing.sm,
    paddingTop: 20,
    margin: 0,
  },
  helperText: {
    ...typography.sizes.caption1,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
