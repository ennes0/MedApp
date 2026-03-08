/**
 * Paywall screen — MediMates Pro subscription
 *
 * Modern paywall with app branding, feature cards, and plan selection.
 * Free: 1 medication + 1 reminder
 * Pro: Unlimited meds, Mates, Chat, Analytics, Export
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Pill,
  Bell,
  Users,
  MessageCircle,
  BarChart3,
  FileDown,
  Check,
  Sparkles,
  Crown,
} from 'lucide-react-native';
import { useColors, useAppTheme } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows, palette } from '@/src/design-system/tokens';
import { Button } from '@/src/design-system/components/button';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { useAuthStore } from '@/src/stores/auth-store';
import { useUIStore } from '@/src/stores/ui-store';
import { useSubscription } from '@/src/features/payments/use-subscription';

const { width: SCREEN_W } = Dimensions.get('window');

type Plan = 'monthly' | 'yearly';

const PLANS: Record<Plan, { label: string; price: string; perMonth: string; badge?: string; desc: string }> = {
  monthly: {
    label: 'Monthly',
    price: '$3.99',
    perMonth: '/month',
    desc: 'Flexible & cancel anytime',
  },
  yearly: {
    label: 'Yearly',
    price: '$2.99',
    perMonth: '/month',
    badge: 'Best Value',
    desc: 'Billed $34.99/year — Save 33%',
  },
};

interface ProFeature {
  Icon: React.ComponentType<any>;
  title: string;
  description: string;
  color: string;
}

const PRO_FEATURES: ProFeature[] = [
  {
    Icon: Pill,
    title: 'Unlimited Medications',
    description: 'Track all your meds with custom schedules & dosages',
    color: palette.blue500,
  },
  {
    Icon: Bell,
    title: 'Smart 3-Tier Reminders',
    description: 'Gentle → firm → urgent notification escalation',
    color: palette.red500,
  },
  {
    Icon: Users,
    title: 'MedMates Matching',
    description: 'Connect with others on the same health journey',
    color: '#5856D6',
  },
  {
    Icon: MessageCircle,
    title: 'Unlimited Chat',
    description: 'Message your mates without any limits',
    color: palette.green500,
  },
  {
    Icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Adherence trends, streaks & detailed insights',
    color: palette.amber500,
  },
  {
    Icon: FileDown,
    title: 'PDF Reports',
    description: 'Export medication reports to share with your doctor',
    color: palette.teal500,
  },
];

export default function PaywallScreen() {
  const c = useColors();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const isPro = user?.pro?.active ?? false;

  const [selectedPlan, setSelectedPlan] = useState<Plan>('monthly');
  const { isLoading, purchase, restorePurchase, manageSubscription } = useSubscription();

  const handleSubscribe = async () => {
    const success = await purchase(selectedPlan);
    if (success) {
      showToast({ type: 'success', title: 'Welcome to Pro!' });
      router.back();
    }
  };

  const handleRestore = async () => {
    const restored = await restorePurchase();
    if (restored) {
      router.back();
    }
  };

  // Already pro
  if (isPro) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 16 }}
          style={styles.activeContainer}
        >
          <View style={[styles.activeIconCircle, { backgroundColor: c.primary + '18' }]}>
            <Crown size={48} color={c.primary} />
          </View>
          <Text style={[styles.activeTitle, { color: c.textPrimary }]}>
            You're a Pro member!
          </Text>
          <Text style={[styles.activeSub, { color: c.textSecondary }]}>
            Plan: {user?.pro?.plan === 'yearly' ? 'Yearly' : 'Monthly'}
          </Text>
          <Button
            title="Manage Subscription"
            variant="secondary"
            onPress={manageSubscription}
            style={styles.manageBtn}
          />
        </MotiView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero header with logo ── */}
        <View style={styles.heroArea}>
          <LinearGradient
            colors={
              isDark
                ? [c.primary + '30', c.primary + '08', 'transparent']
                : [c.primary + '18', c.primary + '06', 'transparent']
            }
            style={styles.heroGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          <MotiView
            from={{ opacity: 0, translateY: -12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, delay: 100 }}
            style={styles.heroContent}
          >
            {/* App logo */}
            <Image
              source={require('@/assets/images/1.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />

            {/* Pro badge */}
            <View style={[styles.proBadge, { backgroundColor: c.primary + '15' }]}>
              <Sparkles size={14} color={c.primary} />
              <Text style={[styles.proBadgeText, { color: c.primary }]}>PRO</Text>
            </View>

            <Text style={[styles.heroTitle, { color: c.textPrimary }]}>
              Unlock the full{'\n'}MedMates experience
            </Text>
            <Text style={[styles.heroSubtitle, { color: c.textSecondary }]}>
              The complete toolkit for managing your medications, connecting with others, and staying on track.
            </Text>
          </MotiView>
        </View>

        {/* ── Feature cards ── */}
        <View style={styles.featuresSection}>
          {PRO_FEATURES.map((feature, i) => (
            <MotiView
              key={feature.title}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300, delay: 150 + i * 60 }}
            >
              <View
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: isDark ? c.elevated : c.card,
                    borderColor: isDark ? c.borderLight : 'transparent',
                    borderWidth: isDark ? 1 : 0,
                    ...shadows.sm,
                  },
                ]}
              >
                <View style={[styles.featureIconBg, { backgroundColor: feature.color + '12' }]}>
                  <feature.Icon size={20} color={feature.color} strokeWidth={2} />
                </View>
                <View style={styles.featureCardText}>
                  <Text style={[styles.featureCardTitle, { color: c.textPrimary }]}>
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureCardDesc, { color: c.textSecondary }]}>
                    {feature.description}
                  </Text>
                </View>
                <View style={[styles.featureCheck, { backgroundColor: c.success + '15' }]}>
                  <Check size={14} color={c.success} strokeWidth={3} />
                </View>
              </View>
            </MotiView>
          ))}
        </View>

        {/* ── Plan selector ── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 550 }}
          style={styles.planSection}
        >
          <Text style={[styles.planSectionTitle, { color: c.textPrimary }]}>
            Choose your plan
          </Text>

          {(Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]).map(([key, plan]) => {
            const isSelected = selectedPlan === key;
            const isYearly = key === 'yearly';
            return (
              <PressableScale key={key} onPress={() => setSelectedPlan(key)}>
                <View
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: isSelected
                        ? isDark ? c.primary + '12' : c.primary + '08'
                        : isDark ? c.elevated : c.card,
                      borderColor: isSelected ? c.primary : isDark ? c.borderLight : c.border,
                      borderWidth: isSelected ? 2 : 1,
                      ...(isSelected ? shadows.sm : shadows.none),
                    },
                  ]}
                >
                  {/* Left: radio + info */}
                  <View style={styles.planLeft}>
                    <View
                      style={[
                        styles.planRadio,
                        {
                          borderColor: isSelected ? c.primary : c.border,
                          backgroundColor: isSelected ? c.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <View style={styles.planRadioInner} />}
                    </View>
                    <View style={styles.planInfo}>
                      <View style={styles.planLabelRow}>
                        <Text style={[styles.planLabel, { color: c.textPrimary }]}>
                          {plan.label}
                        </Text>
                        {plan.badge && (
                          <View style={[styles.planBadge, { backgroundColor: c.primary }]}>
                            <Text style={styles.planBadgeText}>{plan.badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.planDesc, { color: c.textSecondary }]}>
                        {plan.desc}
                      </Text>
                    </View>
                  </View>

                  {/* Right: price */}
                  <View style={styles.planRight}>
                    <Text style={[styles.planPrice, { color: isSelected ? c.primary : c.textPrimary }]}>
                      {plan.price}
                    </Text>
                    <Text style={[styles.planPer, { color: c.textTertiary }]}>
                      {plan.perMonth}
                    </Text>
                  </View>
                </View>
              </PressableScale>
            );
          })}
        </MotiView>
      </ScrollView>

      {/* ── Fixed bottom CTA ── */}
      <View
        style={[
          styles.bottomCta,
          { paddingBottom: insets.bottom + spacing.sm, backgroundColor: c.background },
        ]}
      >
        <LinearGradient
          colors={['transparent', c.background]}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
        <Button
          title={selectedPlan === 'yearly' ? 'Subscribe — $34.99/year' : 'Subscribe — $3.99/month'}
          onPress={handleSubscribe}
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
        />
        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={handleRestore} disabled={isLoading}>
            <Text style={[styles.linkText, { color: c.textTertiary }]}>Restore Purchase</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.legal, { color: c.textTertiary }]}>
          Cancel anytime from your device's subscription settings.{' '}
          Payment will be charged to your Apple ID account.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {},

  /* ── Hero ── */
  heroArea: {
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
    position: 'relative',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  heroLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    marginBottom: spacing.md,
  },
  proBadgeText: {
    ...typography.sizes.caption1,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.sizes.callout,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },

  /* ── Features ── */
  featuresSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.card,
  },
  featureIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + 4,
  },
  featureCardText: {
    flex: 1,
  },
  featureCardTitle: {
    ...typography.sizes.subhead,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureCardDesc: {
    ...typography.sizes.caption1,
    lineHeight: 16,
  },
  featureCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },

  /* ── Plan selector ── */
  planSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  planSectionTitle: {
    ...typography.sizes.headline,
    marginBottom: spacing.md,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.card,
    marginBottom: spacing.sm,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + 4,
  },
  planRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  planInfo: {
    flex: 1,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  planLabel: {
    ...typography.sizes.headline,
  },
  planBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planDesc: {
    ...typography.sizes.caption1,
  },
  planRight: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  planPer: {
    ...typography.sizes.caption2,
  },

  /* ── Bottom CTA ── */
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  bottomGradient: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 40,
  },
  bottomLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  linkText: {
    ...typography.sizes.footnote,
    fontWeight: '600',
  },
  legal: {
    ...typography.sizes.caption2,
    textAlign: 'center',
    lineHeight: 15,
    paddingBottom: spacing.xs,
  },

  /* ── Active Pro state ── */
  activeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  activeIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  activeTitle: {
    ...typography.sizes.title2,
    marginBottom: spacing.xs,
  },
  activeSub: {
    ...typography.sizes.body,
    marginBottom: spacing.lg,
  },
  manageBtn: {
    minWidth: 200,
  },
});
