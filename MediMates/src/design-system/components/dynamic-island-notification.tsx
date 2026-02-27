/**
 * DynamicIslandNotification — iOS Dynamic-Island-style in-app notification
 *
 * Appears as a pill at the top of the screen that expands to show medication
 * reminder details. Supports 3 tiers:
 *   - "pre" (10m / 5m before) — auto-dismisses after a few seconds
 *   - "main" — persists until the user responds (Taken / Snooze / Skip)
 *
 * Animations are buttery-smooth spring-based with staggered children.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useColors, useAppTheme } from '../theme-provider';
import { spacing, radii, shadows, typography, motion } from '../tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  useUIStore,
  type InAppNotification,
} from '@/src/stores/ui-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Layout constants
const PILL_WIDTH = 180;
const PILL_HEIGHT = 36;
const EXPANDED_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const EXPANDED_HEIGHT_PRE = 90;
const EXPANDED_HEIGHT_MAIN = 170;

// Timing
const PRE_REMINDER_AUTO_DISMISS = 6000; // 6 seconds
const EXPAND_DELAY = 400; // ms after pill appears → expands

// Spring configs
const SPRING_ENTER = { damping: 22, stiffness: 200, mass: 0.85 };
const SPRING_EXPAND = { damping: 20, stiffness: 160, mass: 1 };
const SPRING_EXIT = { damping: 24, stiffness: 260, mass: 0.7 };

function DynamicIslandNotificationItem({
  notification,
}: {
  notification: InAppNotification;
}) {
  const c = useColors();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const dismissNotification = useUIStore((s) => s.dismissInAppNotification);
  const respondNotification = useUIStore((s) => s.respondInAppNotification);

  const isMain = notification.tier === 'main';
  const expandedHeight = isMain ? EXPANDED_HEIGHT_MAIN : EXPANDED_HEIGHT_PRE;

  // Shared values
  const progress = useSharedValue(0); // 0 = pill, 1 = expanded
  const enterY = useSharedValue(-60);
  const enterOpacity = useSharedValue(0);
  const exitProgress = useSharedValue(0); // 0 = visible, 1 = gone
  const actionsOpacity = useSharedValue(0);

  // Phase 1: Pill slides in from top
  // Phase 2: Pill expands to card  
  // Phase 3 (pre only): Auto-dismiss after timeout

  const handleDismiss = useCallback(() => {
    exitProgress.value = withSpring(1, SPRING_EXIT, (finished) => {
      if (finished) runOnJS(dismissNotification)(notification.id);
    });
  }, [notification.id, dismissNotification]);

  const handleResponse = useCallback(
    (action: 'taken' | 'snooze' | 'skip') => {
      Haptics.impactAsync(
        action === 'taken'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );
      exitProgress.value = withSpring(1, SPRING_EXIT, (finished) => {
        if (finished) runOnJS(respondNotification)(notification.id, action);
      });
    },
    [notification.id, respondNotification],
  );

  useEffect(() => {
    // Phase 1: Enter
    enterY.value = withSpring(0, SPRING_ENTER);
    enterOpacity.value = withTiming(1, { duration: 350 });

    // Phase 2: Expand after delay
    const expandTimer = setTimeout(() => {
      progress.value = withSpring(1, SPRING_EXPAND);
      // Stagger action buttons
      if (isMain) {
        actionsOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
      }
    }, EXPAND_DELAY);

    // Phase 3: Auto-dismiss for pre-reminders
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    if (!isMain) {
      dismissTimer = setTimeout(() => {
        handleDismiss();
      }, PRE_REMINDER_AUTO_DISMISS);
    }

    return () => {
      clearTimeout(expandTimer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [isMain]);

  // Animated container style
  const containerStyle = useAnimatedStyle(() => {
    const width = interpolate(
      progress.value,
      [0, 1],
      [PILL_WIDTH, EXPANDED_WIDTH],
      Extrapolation.CLAMP,
    );
    const height = interpolate(
      progress.value,
      [0, 1],
      [PILL_HEIGHT, expandedHeight],
      Extrapolation.CLAMP,
    );
    const borderRadius = interpolate(
      progress.value,
      [0, 1],
      [PILL_HEIGHT / 2, radii.lg],
      Extrapolation.CLAMP,
    );

    const translateY = interpolate(
      exitProgress.value,
      [0, 1],
      [enterY.value, -100],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      exitProgress.value,
      [0, 0.5, 1],
      [enterOpacity.value, 0.5, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      exitProgress.value,
      [0, 1],
      [1, 0.85],
      Extrapolation.CLAMP,
    );

    return {
      width,
      height,
      borderRadius,
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  // Pill content (visible when collapsed)
  const pillContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.4],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    position: 'absolute' as const,
  }));

  // Expanded content (visible when expanded)
  const expandedContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.5, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // Action buttons container
  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
    transform: [
      {
        translateY: interpolate(
          actionsOpacity.value,
          [0, 1],
          [8, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const tierLabel = notification.tier === 'pre_10' ? 'in 10 min' : notification.tier === 'pre_5' ? 'in 5 min' : 'now';
  const tierColor = isMain ? c.warning : c.primary;
  const bgColor = isDark
    ? 'rgba(28, 28, 30, 0.97)'
    : 'rgba(255, 255, 255, 0.97)';

  return (
    <Animated.View
      style={[
        styles.island,
        shadows.lg,
        containerStyle,
        {
          backgroundColor: bgColor,
          marginTop: insets.top + spacing.xs,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      {/* Pill state — compact */}
      <Animated.View style={[styles.pillContent, pillContentStyle]}>
        <View style={[styles.pillDot, { backgroundColor: tierColor }]} />
        <Text
          style={[styles.pillText, { color: c.textPrimary }]}
          numberOfLines={1}
        >
          💊 {notification.medName}
        </Text>
      </Animated.View>

      {/* Expanded state */}
      <Animated.View style={[styles.expandedContent, expandedContentStyle]}>
        <Pressable onPress={!isMain ? handleDismiss : undefined} style={styles.expandedInner}>
          {/* Top row: icon + info + time badge */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.medIconCircle,
                { backgroundColor: (notification.medColor ?? c.primary) + '20' },
              ]}
            >
              <IconSymbol name="pill.fill" size={20} color={notification.medColor ?? c.primary} />
            </View>
            <View style={styles.infoColumn}>
              <Text style={[styles.medName, { color: c.textPrimary }]} numberOfLines={1}>
                {notification.medName}
              </Text>
              <Text style={[styles.dosageText, { color: c.textSecondary }]}>
                {notification.dosage} {notification.unit}
              </Text>
            </View>
            <View style={[styles.timeBadge, { backgroundColor: tierColor + '18' }]}>
              <Text style={[styles.timeBadgeText, { color: tierColor }]}>
                {tierLabel}
              </Text>
            </View>
          </View>

          {/* Scheduled time */}
          <View style={styles.timeRow}>
            <IconSymbol name="clock.fill" size={14} color={c.textTertiary} />
            <Text style={[styles.scheduledTime, { color: c.textTertiary }]}>
              Scheduled at {notification.scheduledTime}
            </Text>
          </View>

          {/* Action buttons — only for main tier */}
          {isMain && (
            <Animated.View style={[styles.actionsRow, actionsStyle]}>
              <Pressable
                style={[styles.actionButton, { backgroundColor: c.success + '15' }]}
                onPress={() => handleResponse('taken')}
              >
                <IconSymbol name="checkmark.circle.fill" size={18} color={c.success} />
                <Text style={[styles.actionText, { color: c.success }]}>Taken</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, { backgroundColor: c.warning + '15' }]}
                onPress={() => handleResponse('snooze')}
              >
                <IconSymbol name="clock.arrow.circlepath" size={18} color={c.warning} />
                <Text style={[styles.actionText, { color: c.warning }]}>Snooze</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, { backgroundColor: c.error + '15' }]}
                onPress={() => handleResponse('skip')}
              >
                <IconSymbol name="xmark.circle.fill" size={18} color={c.error} />
                <Text style={[styles.actionText, { color: c.error }]}>Skip</Text>
              </Pressable>
            </Animated.View>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Container — renders active in-app notifications as Dynamic Island pills.
 * Mount once at root level (alongside ToastContainer).
 */
export function DynamicIslandContainer() {
  const notifications = useUIStore((s) => s.inAppNotifications);

  // Show only the most recent notification (stack would be too noisy)
  const latest = notifications.length > 0 ? notifications[notifications.length - 1] : null;

  if (!latest) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <DynamicIslandNotificationItem
        key={latest.id}
        notification={latest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  island: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── Pill state ───
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },
  // ─── Expanded state ───
  expandedContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
  },
  expandedInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  medIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoColumn: {
    flex: 1,
  },
  medName: {
    ...typography.sizes.headline,
    fontWeight: '700',
  },
  dosageText: {
    ...typography.sizes.caption1,
    marginTop: 1,
  },
  timeBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  timeBadgeText: {
    ...typography.sizes.caption2,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  scheduledTime: {
    ...typography.sizes.caption1,
  },
  // ─── Action buttons ───
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.button,
  },
  actionText: {
    ...typography.sizes.caption1,
    fontWeight: '700',
  },
});
