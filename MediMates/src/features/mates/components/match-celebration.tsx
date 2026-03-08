/**
 * MatchCelebration — Short celebration overlay when a mate is found.
 *
 * Shows a brief animated overlay with haptic feedback.
 * Auto-dismisses after ~2 seconds.
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width } = Dimensions.get('window');

interface MatchCelebrationProps {
  visible: boolean;
  mateName: string;
  medName: string;
  medColor: string;
  onDone: () => void;
}

/**
 * Play a strong haptic pattern for match celebration.
 */
async function playMatchFeedback() {
  try {
    // Strong haptic: success notification
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Second haptic with slight delay for a "pulse" effect
    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 250);

    // Third for extra celebration feel
    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 450);
  } catch {
    // Haptics not available
  }
}

export function MatchCelebration({
  visible,
  mateName,
  medName,
  medColor,
  onDone,
}: MatchCelebrationProps) {
  const c = useColors();

  useEffect(() => {
    if (visible) {
      playMatchFeedback();
      const timer = setTimeout(onDone, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Background pulse ring */}
      <MotiView
        from={{ opacity: 0.6, scale: 0.3 }}
        animate={{ opacity: 0, scale: 2.5 }}
        transition={{ type: 'timing', duration: 1200 }}
        style={[styles.pulseRing, { borderColor: medColor }]}
      />
      <MotiView
        from={{ opacity: 0.4, scale: 0.5 }}
        animate={{ opacity: 0, scale: 2 }}
        transition={{ type: 'timing', duration: 1000, delay: 200 }}
        style={[styles.pulseRing, { borderColor: medColor }]}
      />

      {/* Main content */}
      <MotiView
        from={{ opacity: 0, scale: 0.5, translateY: 20 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 150 }}
        style={[styles.card, { backgroundColor: c.card }]}
      >
        {/* Animated icon */}
        <MotiView
          from={{ rotate: '-20deg', scale: 0 }}
          animate={{ rotate: '0deg', scale: 1 }}
          transition={{ type: 'spring', damping: 10, delay: 150 }}
          style={[styles.iconCircle, { backgroundColor: medColor + '20' }]}
        >
          <IconSymbol name="person.2.fill" size={32} color={medColor} />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 300 }}
        >
          <Text style={[styles.title, { color: c.textPrimary }]}>
            Mate Found! 🎉
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 450 }}
        >
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: medColor }}>{mateName}</Text>
            {' '}also takes{' '}
            <Text style={{ fontWeight: '600', color: medColor }}>{medName}</Text>
          </Text>
        </MotiView>

        {/* Sparkle dots */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <MotiView
            key={i}
            from={{ opacity: 0, scale: 0, translateX: 0, translateY: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.2, 0],
              translateX: Math.cos((i * Math.PI * 2) / 6) * 60,
              translateY: Math.sin((i * Math.PI * 2) / 6) * 60,
            }}
            transition={{ type: 'timing', duration: 800, delay: 200 + i * 80 }}
            style={[styles.sparkle, { backgroundColor: medColor }]}
          />
        ))}
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 100,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderRadius: radii.lg + 4,
    maxWidth: width - spacing.xl * 2,
    minWidth: 260,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.sizes.title3,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.sizes.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  sparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
