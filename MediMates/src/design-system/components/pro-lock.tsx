/**
 * ProLock — Blur overlay for Pro-only features
 *
 * Renders children with a blur overlay + lock icon.
 * On press → navigate to paywall.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { PressableScale } from './pressable-scale';
import { useColors, useAppTheme } from '../theme-provider';
import { spacing, radii, typography } from '../tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface ProLockProps {
  children: React.ReactNode;
  /** Whether user is Pro (if true, renders children without lock) */
  isPro?: boolean;
}

export function ProLock({ children, isPro = false }: ProLockProps) {
  const { isDark } = useAppTheme();
  const c = useColors();
  const router = useRouter();

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <PressableScale onPress={() => router.push('/(tabs)/profile/paywall')}>
      <View style={styles.wrapper}>
        {/* Preview content (blurred) */}
        <View style={styles.contentPreview}>{children}</View>

        {/* Blur overlay */}
        <BlurView
          intensity={20}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        {/* Lock badge */}
        <View style={styles.lockOverlay}>
          <View
            style={[
              styles.lockBadge,
              { backgroundColor: c.primary },
            ]}
          >
            <IconSymbol name="lock.fill" size={16} color="#FFFFFF" />
            <Text style={styles.lockText}>PRO</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  contentPreview: {
    opacity: 0.6,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    gap: spacing.xs,
  },
  lockText: {
    color: '#FFFFFF',
    ...typography.sizes.footnote,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
