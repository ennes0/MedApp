/**
 * Paywall screen — MediMates Pro subscription
 *
 * Premium design with engaging gradient, social proof, feature highlights.
 * Free: 1 medication + 1 reminder
 * Pro: Unlimited meds, Mates, Chat, Analytics, Export
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { usePaymentSheet } from '@stripe/stripe-react-native';
import { useColors, useAppTheme } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Button } from '@/src/design-system/components/button';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuthStore } from '@/src/stores/auth-store';
import { useUIStore } from '@/src/stores/ui-store';
import { useSubscription } from '@/src/features/payments/use-subscription';

type Plan = 'monthly' | 'yearly';

const PLANS: Record<Plan, { label: string; price: string; perMonth: string; badge?: string }> = {
  monthly: {
    label: 'Monthly',
    price: '$4.99/mo',
    perMonth: '$4.99/mo',
  },
  yearly: {
    label: 'Yearly',
    price: '$39.99/yr',
    perMonth: '$3.33/mo',
    badge: 'Save 33%',
  },
};

interface FeatureCompare {
  icon: string;
  title: string;
  free: string;
  pro: string;
  iconColor: string;
}

const FEATURE_COMPARISON: FeatureCompare[] = [
  {
    icon: 'pill.fill',
    title: 'Medications',
    free: '1 medication',
    pro: 'Unlimited',
    iconColor: '#007AFF',
  },
  {
    icon: 'bell.badge.fill',
    title: 'Smart Reminders',
    free: '1 reminder',
    pro: 'Unlimited 3-tier system',
    iconColor: '#FF3B30',
  },
  {
    icon: 'person.2.fill',
    title: 'MediMates',
    free: 'Not available',
    pro: 'Find & connect with mates',
    iconColor: '#5856D6',
  },
  {
    icon: 'bubble.left.and.bubble.right.fill',
    title: 'Chat',
    free: 'Not available',
    pro: 'Unlimited messaging',
    iconColor: '#34C759',
  },
  {
    icon: 'chart.bar.fill',
    title: 'Analytics',
    free: 'Basic',
    pro: 'Advanced insights & trends',
    iconColor: '#FF9500',
  },
  {
    icon: 'arrow.down.doc.fill',
    title: 'Export',
    free: 'Not available',
    pro: 'PDF/CSV reports',
    iconColor: '#00C7BE',
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

  const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');
  const { isLoading, createCheckout, restorePurchase } = useSubscription();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  const handleSubscribe = async () => {
    const checkout = await createCheckout(selectedPlan);
    if (!checkout) return;

    const { error: initError } = await initPaymentSheet({
      paymentIntentClientSecret: checkout.clientSecret,
      customerEphemeralKeySecret: checkout.ephemeralKey,
      customerId: checkout.customerId,
      merchantDisplayName: 'MediMates',
      allowsDelayedPaymentMethods: false,
    });

    if (initError) {
      showToast({ type: 'error', title: 'Could not initialize payment' });
      return;
    }

    const { error: presentError } = await presentPaymentSheet();

    if (presentError) {
      if (presentError.code !== 'Canceled') {
        showToast({ type: 'error', title: 'Payment failed. Please try again.' });
      }
      return;
    }

    showToast({ type: 'success', title: 'Welcome to Pro!' });
    router.back();
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
            <IconSymbol name="crown.fill" size={48} color={c.primary} />
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
            onPress={() => {}}
            style={styles.manageBtn}
          />
        </MotiView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with gradient */}
        <View style={styles.headerArea}>
          <LinearGradient
            colors={isDark ? ['#1a1a2e', '#16213e', 'transparent'] : ['#667eea', '#764ba2', 'transparent']}
            style={styles.headerGradient}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
          />
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
            style={styles.headerContent}
          >
            <View style={styles.proIconCircle}>
              <IconSymbol name="crown.fill" size={36} color="#FFD700" />
            </View>
            <Text style={[styles.title, { color: isDark ? c.textPrimary : '#FFFFFF' }]}>
              MediMates Pro
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? c.textSecondary : 'rgba(255,255,255,0.85)' }]}>
              Your health journey deserves the best tools
            </Text>

            {/* Social proof */}
            <View style={[styles.socialProof, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)' }]}>
              <IconSymbol name="star.fill" size={14} color="#FFD700" />
              <Text style={[styles.socialProofText, { color: isDark ? c.textSecondary : 'rgba(255,255,255,0.9)' }]}>
                Trusted by 10,000+ users
              </Text>
            </View>
          </MotiView>
        </View>

        {/* Feature highlights — card-style */}
        <Text style={[styles.featureSectionTitle, { color: c.textPrimary }]}>
          Everything you need
        </Text>

        {FEATURE_COMPARISON.map((feature, i) => {
          const isLocked = feature.free === 'Not available';
          return (
            <MotiView
              key={feature.title}
              from={{ opacity: 0, translateX: -15 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 250, delay: 80 + i * 50 }}
            >
              <View style={[styles.featureRow, { backgroundColor: c.card, ...shadows.sm }]}>
                <View style={[styles.featureIcon, { backgroundColor: feature.iconColor + '15' }]}>
                  <IconSymbol name={feature.icon as any} size={18} color={feature.iconColor} />
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: c.textPrimary }]}>
                    {feature.title}
                  </Text>
                  <View style={styles.featureCompare}>
                    {isLocked ? (
                      <View style={styles.featureFreeTag}>
                        <IconSymbol name="xmark" size={10} color={c.textTertiary} />
                        <Text style={[styles.featureFreeText, { color: c.textTertiary }]}>
                          Free
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.featureFreeTag}>
                        <Text style={[styles.featureFreeText, { color: c.textTertiary }]}>
                          {feature.free}
                        </Text>
                      </View>
                    )}
                    <IconSymbol name="arrow.right" size={10} color={c.textTertiary} />
                    <View style={[styles.featureProTag, { backgroundColor: c.success + '15' }]}>
                      <IconSymbol name="checkmark" size={10} color={c.success} />
                      <Text style={[styles.featureProText, { color: c.success }]}>
                        {feature.pro}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </MotiView>
          );
        })}

        {/* Plan selector */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 500 }}
          style={styles.planSection}
        >
          <Text style={[styles.planSectionTitle, { color: c.textPrimary }]}>
            Choose your plan
          </Text>
          <View style={styles.planCards}>
            {(Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]).map(([key, plan]) => {
              const isSelected = selectedPlan === key;
              return (
                <PressableScale key={key} onPress={() => setSelectedPlan(key)}>
                  <View
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: isSelected ? c.primary + '10' : c.card,
                        borderColor: isSelected ? c.primary : c.borderLight,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    {plan.badge && (
                      <View style={[styles.saveBadge, { backgroundColor: c.success }]}>
                        <Text style={styles.saveBadgeText}>{plan.badge}</Text>
                      </View>
                    )}
                    <Text style={[styles.planLabel, { color: c.textPrimary }]}>
                      {plan.label}
                    </Text>
                    <Text style={[styles.planPrice, { color: c.primary }]}>
                      {plan.price}
                    </Text>
                    <Text style={[styles.planPer, { color: c.textTertiary }]}>
                      {plan.perMonth}
                    </Text>

                    {/* Radio */}
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: isSelected ? c.primary : c.border,
                          backgroundColor: isSelected ? c.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </MotiView>
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + spacing.sm, backgroundColor: c.background }]}>
        <LinearGradient
          colors={['transparent', c.background]}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
        <Button
          title={`Subscribe — ${PLANS[selectedPlan].price}`}
          onPress={handleSubscribe}
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
        />
        <TouchableOpacity onPress={handleRestore} disabled={isLoading} style={styles.restoreBtn}>
          <Text style={[styles.restoreText, { color: c.textTertiary }]}>Restore Purchase</Text>
        </TouchableOpacity>
        <Text style={[styles.legal, { color: c.textTertiary }]}>
          Payment via Stripe. Cancel anytime from your account settings.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },

  // Header
  headerArea: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    position: 'relative',
    marginHorizontal: -spacing.lg,
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  proIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,215,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.sizes.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  socialProofText: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },

  // Feature rows
  featureSectionTitle: {
    ...typography.sizes.title3,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.card,
    marginBottom: spacing.sm,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + 4,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...typography.sizes.subhead,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureCompare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  featureFreeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  featureFreeText: {
    ...typography.sizes.caption1,
  },
  featureProTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  featureProText: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },

  // Plan selector
  planSection: {
    marginBottom: spacing.md,
  },
  planSectionTitle: {
    ...typography.sizes.headline,
    marginBottom: spacing.md,
  },
  planCards: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  planCard: {
    flex: 1,
    borderRadius: radii.card,
    padding: spacing.md,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minWidth: 0,
  },
  saveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderBottomLeftRadius: radii.sm,
  },
  saveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  planLabel: {
    ...typography.sizes.headline,
    marginBottom: spacing.xs,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  planPer: {
    ...typography.sizes.caption1,
    marginBottom: spacing.sm,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },

  // Bottom CTA
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
  restoreBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  restoreText: {
    ...typography.sizes.footnote,
    fontWeight: '600',
  },
  legal: {
    ...typography.sizes.caption2,
    textAlign: 'center',
    lineHeight: 15,
  },

  // Active Pro state
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
