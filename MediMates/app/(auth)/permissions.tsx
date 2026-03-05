/**
 * Permissions screen — Request notification permissions
 *
 * Beautiful, modern design with animated notification preview
 * and clear explanation of why notifications matter.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Button } from '@/src/design-system/components/button';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function PermissionsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    try {
      setLoading(true);
      // Check current status first
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        // This triggers the native iOS/Android system permission dialog
        await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowProvisional: false,
          },
        });
      }
    } catch (e) {
      console.warn('[Permissions] requestPermissionsAsync failed:', e);
    } finally {
      setLoading(false);
      router.push('/(auth)/social-opt-in');
    }
  };

  const handleSkip = () => {
    router.push('/(auth)/social-opt-in');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Top illustration area */}
      <View style={styles.illustrationArea}>
        <LinearGradient
          colors={[c.warningLight, 'transparent']}
          style={styles.gradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Bell icon with animated ring */}
        <MotiView
          from={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 200 }}
        >
          <View style={[styles.bellCircle, { backgroundColor: c.warning + '20' }]}>
            <View style={[styles.bellInner, { backgroundColor: c.warning + '30' }]}>
              <IconSymbol name="bell.badge.fill" size={56} color={c.warning} />
            </View>
          </View>
        </MotiView>

        {/* Notification preview card */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 500 }}
          style={styles.previewCardWrapper}
        >
          <View style={[styles.previewCard, { backgroundColor: c.card, borderColor: c.borderLight }]}>
            <View style={styles.previewHeader}>
              <View style={[styles.previewAppIcon, { backgroundColor: c.primary }]}>
                <IconSymbol name="pill.fill" size={12} color="#FFF" />
              </View>
              <Text style={[styles.previewAppName, { color: c.textTertiary }]}>MEDIMATES</Text>
              <Text style={[styles.previewTime, { color: c.textTertiary }]}>now</Text>
            </View>
            <Text style={[styles.previewTitle, { color: c.textPrimary }]}>
              Time for Vitamin D
            </Text>
            <Text style={[styles.previewBody, { color: c.textSecondary }]}>
              1000 IU — Take with food for better absorption
            </Text>
          </View>
        </MotiView>
      </View>

      {/* Content */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 300 }}
        style={styles.content}
      >
        <Text style={[styles.title, { color: c.textPrimary }]}>
          Never miss a dose
        </Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          Get gentle, timely reminders when it's time to take your medications.
          We'll keep you on track.
        </Text>

        {/* Benefits */}
        <View style={styles.benefits}>
          {[
            { icon: 'clock.fill', text: 'Custom schedule for each medication' },
            { icon: 'moon.fill', text: 'Smart quiet hours — no midnight alerts' },
            { icon: 'gear', text: 'Full control in Settings anytime' },
          ].map((item, i) => (
            <MotiView
              key={i}
              from={{ opacity: 0, translateX: -10 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 300, delay: 600 + i * 100 }}
            >
              <View style={styles.benefitRow}>
                <IconSymbol name={item.icon as any} size={16} color={c.primary} />
                <Text style={[styles.benefitText, { color: c.textSecondary }]}>
                  {item.text}
                </Text>
              </View>
            </MotiView>
          ))}
        </View>
      </MotiView>

      {/* Buttons */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 500 }}
        style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Button
          title="Allow Notifications"
          onPress={handleAllow}
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
        />
        <Button
          title="Maybe Later"
          onPress={handleSkip}
          variant="ghost"
          size="md"
          fullWidth
        />
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Illustration
  illustrationArea: {
    height: '38%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bellCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCardWrapper: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.xl,
    right: spacing.xl,
  },
  previewCard: {
    padding: spacing.sm + 4,
    borderRadius: radii.card,
    borderWidth: 1,
    ...shadows.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  previewAppIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewAppName: {
    ...typography.sizes.caption2,
    fontWeight: '600',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewTime: {
    ...typography.sizes.caption2,
  },
  previewTitle: {
    ...typography.sizes.subhead,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewBody: {
    ...typography.sizes.footnote,
    lineHeight: 17,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.sizes.body,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  benefits: {
    gap: spacing.sm + 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  benefitText: {
    ...typography.sizes.subhead,
    flex: 1,
  },

  // Bottom
  bottom: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
});
