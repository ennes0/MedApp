/**
 * MatchCelebration - short overlay when a mate is found.
 *
 * Uses a single haptic pulse and auto-dismisses quickly.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

interface MatchCelebrationProps {
  visible: boolean;
  mateName: string;
  medName: string;
  medColor: string;
  onDone: () => void;
}

async function playMatchFeedback() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics may not be available on all devices.
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
  const { t } = useTranslation();
  const onDoneRef = useRef(onDone);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!visible) {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      return;
    }

    void playMatchFeedback();

    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      onDoneRef.current();
    }, 1400);

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <MotiView
        from={{ opacity: 0.3, scale: 0.8 }}
        animate={{ opacity: 0, scale: 1.45 }}
        transition={{ type: 'timing', duration: 650 }}
        style={[styles.pulseRing, { borderColor: medColor }]}
      />

      <MotiView
        from={{ opacity: 0, scale: 0.94, translateY: 10 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 220 }}
        style={[styles.card, { backgroundColor: c.card }]}
      >
        <MotiView
          from={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'timing', duration: 180, delay: 80 }}
          style={[styles.iconCircle, { backgroundColor: medColor + '20' }]}
        >
          <IconSymbol name="person.2.fill" size={28} color={medColor} />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 180, delay: 120 }}
        >
          <Text style={[styles.title, { color: c.textPrimary }]}>{t('matesMatch.mateFound')}</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 180, delay: 180 }}
        >
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {t('matesMatch.alsoTakesPrefix', { name: mateName })}
            <Text style={{ fontWeight: '600', color: medColor }}>{medName}</Text>
          </Text>
        </MotiView>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 100,
  },
  pulseRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    maxWidth: width - spacing.xl * 2,
    minWidth: 240,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm + 2,
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
    lineHeight: 20,
  },
});
