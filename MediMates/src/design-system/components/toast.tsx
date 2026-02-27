/**
 * Toast — Slide-in notification toast
 *
 * Variants: success, error, info
 * Managed via Zustand ui-store.
 *
 * Smooth spring animation with gentle easing — no jitter.
 */

import React, { useEffect, useCallback } from 'react';
import { Text, StyleSheet, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../theme-provider';
import { spacing, radii, shadows, typography, motion } from '../tokens';
import { useUIStore, type ToastItem } from '@/src/stores/ui-store';
import { IconSymbol } from '@/components/ui/icon-symbol';

const TOAST_DURATION = 3500;
const ENTER_DURATION = 500;
const EXIT_DURATION = 350;

const variantIcons: Record<ToastItem['type'], string> = {
  success: 'checkmark.circle.fill',
  error: 'xmark.octagon.fill',
  info: 'info.circle.fill',
};

function ToastMessage({ toast }: { toast: ToastItem }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const dismissToast = useUIStore((s) => s.dismissToast);

  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  const variantColors = {
    success: c.success,
    error: c.error,
    info: c.primary,
  };

  const dismiss = useCallback(() => {
    'worklet';
    translateY.value = withTiming(-80, { duration: EXIT_DURATION });
    opacity.value = withTiming(0, { duration: EXIT_DURATION });
    scale.value = withTiming(0.92, { duration: EXIT_DURATION });
    runOnJS(dismissToast)(toast.id);
  }, [toast.id, dismissToast]);

  useEffect(() => {
    // Smooth enter animation
    translateY.value = withSpring(0, {
      damping: 24,
      stiffness: 180,
      mass: 0.9,
    });
    opacity.value = withTiming(1, { duration: ENTER_DURATION });
    scale.value = withSpring(1, {
      damping: 22,
      stiffness: 200,
      mass: 0.8,
    });

    // Auto-dismiss
    const timer = setTimeout(() => {
      translateY.value = withTiming(-80, { duration: EXIT_DURATION });
      opacity.value = withTiming(0, { duration: EXIT_DURATION });
      scale.value = withTiming(0.92, { duration: EXIT_DURATION });
      setTimeout(() => dismissToast(toast.id), EXIT_DURATION);
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [toast.id, dismissToast]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.toast,
        shadows.md,
        animatedStyle,
        {
          backgroundColor: c.card,
          borderLeftColor: variantColors[toast.type],
          marginTop: insets.top + spacing.sm,
        },
      ]}
    >
      <Pressable
        style={styles.toastInner}
        onPress={() => {
          translateY.value = withTiming(-80, { duration: EXIT_DURATION });
          opacity.value = withTiming(0, { duration: EXIT_DURATION });
          scale.value = withTiming(0.92, { duration: EXIT_DURATION });
          setTimeout(() => dismissToast(toast.id), EXIT_DURATION);
        }}
      >
        <IconSymbol
          name={variantIcons[toast.type] as any}
          size={20}
          color={variantColors[toast.type]}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: c.textPrimary }]}>
            {toast.title}
          </Text>
          {toast.message && (
            <Text style={[styles.message, { color: c.textSecondary }]}>
              {toast.message}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastMessage key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

/** Convenience function — call from anywhere */
export function Toast() {
  return null; // Placeholder — actual usage is via useUIStore().showToast()
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  toast: {
    marginHorizontal: spacing.md,
    borderRadius: radii.card,
    borderLeftWidth: 4,
    width: '92%',
    overflow: 'hidden',
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.sizes.subhead,
    fontWeight: '600',
  },
  message: {
    ...typography.sizes.caption1,
    marginTop: 2,
  },
});
