/**
 * Paywall screen — MedMates Pro subscription
 *
 * Modern paywall with app branding, feature cards, and plan selection.
 * Free: 1 medication + 1 reminder
 * Pro: Unlimited meds, Mates, Chat, Analytics, Export
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import Purchases from 'react-native-purchases';
import {
  Pill,
  Bell,
  Users,
  MessageCircle,
  BarChart3,
  FileDown,
  Check,
  ExternalLink,
} from 'lucide-react-native';
import { useColors, useAppTheme } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows, palette } from '@/src/design-system/tokens';
import { Button } from '@/src/design-system/components/button';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { useAuthStore } from '@/src/stores/auth-store';
import { useUIStore } from '@/src/stores/ui-store';
import {
  useSubscription,
  RC_PRODUCTS,
  RC_OFFERING,
} from '@/src/features/payments/use-subscription';

// Legal links
const LEGAL_LINKS = {
  termsOfUse: 'https://lavish-shirt-ecb.notion.site/MedMates-Terms-of-Use-321ca73dd79680deb2c3ed0c1e229165',
  appleStandardEula: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  privacyPolicy: 'https://lavish-shirt-ecb.notion.site/MedMates-Privacy-Policy-31dca73dd79680a386f8daf27aa6b4af',
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const IS_COMPACT_SCREEN = SCREEN_W < 390 || SCREEN_H < 780;

type Plan = 'monthly' | 'yearly';

const PRO_IMAGES = {
  general: require('@/assets/images/pro.png'),
  monthly: require('@/assets/images/montthly.png'),
  yearly: require('@/assets/images/annually.png'),
} as const;

// Pricing structured per App Store guidelines:
// - billedPrice: The actual amount charged (MUST be most prominent)
// - billedPeriod: The billing cycle
// - monthlyEquivalent: Optional calculated monthly price (subordinate display)
type PlanPricing = {
  label: string; 
  billedPrice: string; 
  billedPeriod: string;
  monthlyEquivalent?: string;
  badge?: string; 
  savings?: string;
};

const PLANS: Record<Plan, PlanPricing> = {
  monthly: {
    label: 'Monthly',
    billedPrice: '$3.99',
    billedPeriod: 'month',
  },
  yearly: {
    label: 'Yearly',
    billedPrice: '$35.99',
    billedPeriod: 'year',
    monthlyEquivalent: '$3.00/mo',
    badge: 'Save 25%',
    savings: 'Save $11.89 compared to monthly',
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
  const [plans, setPlans] = useState<Record<Plan, PlanPricing>>(PLANS);
  const { isLoading, purchase, restorePurchase, manageSubscription } = useSubscription();

  useEffect(() => {
    let mounted = true;

    const loadLocalizedPricing = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        const preferredPackages = offerings.all?.[RC_OFFERING]?.availablePackages ?? [];
        const currentPackages = offerings.current?.availablePackages ?? [];
        const fallbackPackages =
          Object.values(offerings.all ?? {}).find(
            (offering) => offering.availablePackages.length > 0,
          )?.availablePackages ?? [];

        const packages =
          preferredPackages.length > 0
            ? preferredPackages
            : currentPackages.length > 0
              ? currentPackages
              : fallbackPackages;

        const monthlyPkg = packages.find(
          (pkg) => pkg.product.identifier === RC_PRODUCTS.monthly,
        );
        const yearlyPkg = packages.find(
          (pkg) => pkg.product.identifier === RC_PRODUCTS.yearly,
        );

        if (!monthlyPkg && !yearlyPkg) return;

        const nextPlans: Record<Plan, PlanPricing> = {
          ...PLANS,
          monthly: {
            ...PLANS.monthly,
            billedPrice: monthlyPkg?.product.priceString ?? PLANS.monthly.billedPrice,
          },
          yearly: {
            ...PLANS.yearly,
            billedPrice: yearlyPkg?.product.priceString ?? PLANS.yearly.billedPrice,
          },
        };

        if (monthlyPkg?.product.pricePerMonthString) {
          nextPlans.monthly.monthlyEquivalent = monthlyPkg.product.pricePerMonthString;
        }
        if (yearlyPkg?.product.pricePerMonthString) {
          nextPlans.yearly.monthlyEquivalent = yearlyPkg.product.pricePerMonthString;
        }

        if (mounted) {
          setPlans(nextPlans);
        }
      } catch {
        // Keep fallback pricing when RevenueCat packages are not reachable.
      }
    };

    void loadLocalizedPricing();
    return () => {
      mounted = false;
    };
  }, []);

  const openLegalUrl = useCallback(
    async (url: string) => {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) {
          showToast({ type: 'error', title: 'Could not open link' });
          return;
        }
        await WebBrowser.openBrowserAsync(url);
      } catch {
        showToast({ type: 'error', title: 'Could not open link' });
      }
    },
    [showToast],
  );

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
            <Image source={PRO_IMAGES.general} style={styles.activeProImage} resizeMode="contain" />
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 112 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero header with logo ── */}
        <View style={[styles.heroArea, IS_COMPACT_SCREEN && styles.heroAreaCompact]}>
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
            style={[styles.heroContent, IS_COMPACT_SCREEN && styles.heroContentCompact]}
          >
            {/* App logo */}
            <Image
              source={PRO_IMAGES.general}
              style={[styles.heroLogo, IS_COMPACT_SCREEN && styles.heroLogoCompact]}
              resizeMode="contain"
            />

            {/* Pro badge */}
            <View style={[styles.proBadge, IS_COMPACT_SCREEN && styles.proBadgeCompact, { backgroundColor: c.primary + '15' }]}>
              <Image source={PRO_IMAGES.general} style={styles.proBadgeIcon} resizeMode="contain" />
              <Text style={[styles.proBadgeText, { color: c.primary }]}>PRO</Text>
            </View>

            <Text style={[styles.heroTitle, IS_COMPACT_SCREEN && styles.heroTitleCompact, { color: c.textPrimary }]}>
              Unlock the full{'\n'}MedMates experience
            </Text>
            <Text style={[styles.heroSubtitle, IS_COMPACT_SCREEN && styles.heroSubtitleCompact, { color: c.textSecondary }]}>
              The complete toolkit for managing your medications, connecting with others, and staying on track.
            </Text>
          </MotiView>
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

          {(Object.entries(plans) as [Plan, PlanPricing][]).map(([key, plan]) => {
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
                        <Image
                          source={isYearly ? PRO_IMAGES.yearly : PRO_IMAGES.monthly}
                          style={styles.planTypeIcon}
                          resizeMode="contain"
                        />
                        <Text style={[styles.planLabel, { color: c.textPrimary }]}>
                          {plan.label}
                        </Text>
                        {plan.badge && (
                          <View style={[styles.planBadge, { backgroundColor: c.success }]}>
                            <Text style={styles.planBadgeText}>{plan.badge}</Text>
                          </View>
                        )}
                      </View>
                      {/* Subscription details - required by App Store */}
                      <Text style={[styles.planSubscriptionInfo, { color: c.textSecondary }]}>
                        {isYearly 
                          ? 'Auto-renews yearly' 
                          : 'Auto-renews monthly'}
                      </Text>
                      {plan.savings && (
                        <Text style={[styles.planSavings, { color: c.success }]}>
                          {plan.savings}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Right: BILLED PRICE (most prominent per App Store) */}
                  <View style={styles.planRight}>
                    <Text style={[styles.planBilledPrice, { color: isSelected ? c.primary : c.textPrimary }]}>
                      {plan.billedPrice}
                    </Text>
                    <Text style={[styles.planBilledPeriod, { color: c.textSecondary }]}>
                      /{plan.billedPeriod}
                    </Text>
                    {/* Monthly equivalent - subordinate display */}
                    {plan.monthlyEquivalent && (
                      <Text style={[styles.planMonthlyEquivalent, { color: c.textTertiary }]}>
                        ({plan.monthlyEquivalent})
                      </Text>
                    )}
                  </View>
                </View>
              </PressableScale>
            );
          })}

          {/* Subscription title and terms */}
          <View
            style={[
              styles.subscriptionTermsBox,
              {
                backgroundColor: isDark ? c.elevated : c.card,
                borderColor: isDark ? c.borderLight : c.border,
                ...shadows.sm,
              },
            ]}
          >
            <Text style={[styles.subscriptionEyebrow, { color: c.primary }]}>
              Billing details
            </Text>
            <Text style={[styles.subscriptionTitle, { color: c.textPrimary }]}> 
              {selectedPlan === 'yearly'
                ? `Billed at ${plans.yearly.billedPrice} per year`
                : `Billed at ${plans.monthly.billedPrice} per month`}
            </Text>
            <Text style={[styles.subscriptionTerms, { color: c.textSecondary }]}>
              {selectedPlan === 'yearly' 
                ? `Billed as one payment of ${plans.yearly.billedPrice} per year. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.`
                : `Billed as ${plans.monthly.billedPrice} per month. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.`}
            </Text>
            <View style={styles.subscriptionList}>
              <Text style={[styles.subscriptionListItem, { color: c.textSecondary }]}>• Payment is charged to your Apple ID at confirmation.</Text>
              <Text style={[styles.subscriptionListItem, { color: c.textSecondary }]}>• Renewal is charged within 24 hours before period end.</Text>
              <Text style={[styles.subscriptionListItem, { color: c.textSecondary }]}>• Manage or cancel anytime in App Store account settings.</Text>
            </View>
          </View>
        </MotiView>

        {/* ── Feature cards ── */}
        <View style={[styles.featuresSection, IS_COMPACT_SCREEN && styles.featuresSectionCompact]}>
          <Text style={[styles.featuresSectionTitle, { color: c.textPrimary }]}>Everything included</Text>
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
                  IS_COMPACT_SCREEN && styles.featureCardCompact,
                  {
                    backgroundColor: isDark ? c.elevated : c.card,
                    borderColor: isDark ? c.borderLight : 'transparent',
                    borderWidth: isDark ? 1 : 0,
                    ...shadows.sm,
                  },
                ]}
              >
                <View style={[styles.featureIconBg, IS_COMPACT_SCREEN && styles.featureIconBgCompact, { backgroundColor: feature.color + '12' }]}>
                  <feature.Icon size={IS_COMPACT_SCREEN ? 18 : 20} color={feature.color} strokeWidth={2} />
                </View>
                <View style={styles.featureCardText}>
                  <Text style={[styles.featureCardTitle, { color: c.textPrimary }]}>
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureCardDesc, { color: c.textSecondary }]}>
                    {feature.description}
                  </Text>
                </View>
                <View style={[styles.featureCheck, IS_COMPACT_SCREEN && styles.featureCheckCompact, { backgroundColor: c.success + '15' }]}>
                  <Check size={14} color={c.success} strokeWidth={3} />
                </View>
              </View>
            </MotiView>
          ))}
        </View>
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
          title={
            selectedPlan === 'yearly'
              ? `Subscribe for ${plans.yearly.billedPrice}/year`
              : `Subscribe for ${plans.monthly.billedPrice}/month`
          }
          onPress={handleSubscribe}
          variant="primary"
          size="md"
          fullWidth
          loading={isLoading}
          style={styles.subscribeButton}
        />
        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={handleRestore} disabled={isLoading}>
            <Text style={[styles.linkText, { color: c.primary }]}>Restore Purchase</Text>
          </TouchableOpacity>
        </View>

        {/* Legal links - Required by App Store */}
        <View style={styles.legalLinksRow}>
          <TouchableOpacity 
            onPress={() => void openLegalUrl(LEGAL_LINKS.termsOfUse)}
            style={styles.legalLinkTouchable}
          >
            <Text style={[styles.legalLinkText, { color: c.primary }]}>Terms of Use</Text>
            <ExternalLink size={10} color={c.primary} />
          </TouchableOpacity>
          <Text style={[styles.legalSeparator, { color: c.textTertiary }]}>|</Text>
          <TouchableOpacity 
            onPress={() => void openLegalUrl(LEGAL_LINKS.appleStandardEula)}
            style={styles.legalLinkTouchable}
          >
            <Text style={[styles.legalLinkText, { color: c.primary }]}>Apple EULA</Text>
            <ExternalLink size={10} color={c.primary} />
          </TouchableOpacity>
          <Text style={[styles.legalSeparator, { color: c.textTertiary }]}>|</Text>
          <TouchableOpacity 
            onPress={() => void openLegalUrl(LEGAL_LINKS.privacyPolicy)}
            style={styles.legalLinkTouchable}
          >
            <Text style={[styles.legalLinkText, { color: c.primary }]}>Privacy Policy</Text>
            <ExternalLink size={10} color={c.primary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.consentText, { color: c.textSecondary }]}>
          By tapping Subscribe, you agree to the Terms of Use and Privacy Policy.
        </Text>

        <Text style={[styles.legal, { color: c.textTertiary }]}>
          Payment will be charged to your Apple ID account at confirmation of purchase. 
          Subscription automatically renews unless cancelled at least 24 hours before 
          the end of the current period. Your account will be charged for renewal within 
          24 hours prior to the end of the current period. You can manage and cancel your 
          subscriptions in your App Store account settings after purchase.
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    position: 'relative',
  },
  heroAreaCompact: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  heroContentCompact: {
    paddingHorizontal: spacing.md,
  },
  heroLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  heroLogoCompact: {
    width: 56,
    height: 56,
    marginBottom: spacing.sm,
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
  proBadgeCompact: {
    marginBottom: spacing.sm,
  },
  proBadgeText: {
    ...typography.sizes.caption1,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  proBadgeIcon: {
    width: 14,
    height: 14,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroTitleCompact: {
    fontSize: 24,
    lineHeight: 29,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.sizes.callout,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  heroSubtitleCompact: {
    fontSize: 14,
    lineHeight: 19,
    paddingHorizontal: 0,
  },

  /* ── Features ── */
  featuresSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  featuresSectionCompact: {
    marginBottom: spacing.md,
  },
  featuresSectionTitle: {
    ...typography.sizes.subhead,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.card,
  },
  featureCardCompact: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 4,
  },
  featureIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + 4,
  },
  featureIconBgCompact: {
    width: 34,
    height: 34,
    borderRadius: 10,
    marginRight: spacing.sm,
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
  featureCheckCompact: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: spacing.xs,
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
  planTypeIcon: {
    width: 18,
    height: 18,
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
  planSubscriptionInfo: {
    fontSize: 13,
    marginTop: 2,
  },
  planSavings: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  planRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  // Billed price - MOST PROMINENT per App Store guidelines
  planBilledPrice: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  planBilledPeriod: {
    ...typography.sizes.footnote,
    fontWeight: '600',
  },
  // Monthly equivalent - subordinate display
  planMonthlyEquivalent: {
    ...typography.sizes.caption2,
    marginTop: 2,
  },
  subscriptionTermsBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  subscriptionEyebrow: {
    ...typography.sizes.caption1,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subscriptionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subscriptionTerms: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  subscriptionList: {
    marginTop: spacing.sm,
    gap: 4,
  },
  subscriptionListItem: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'left',
  },

  /* ── Bottom CTA ── */
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  bottomGradient: {
    position: 'absolute',
    top: -28,
    left: 0,
    right: 0,
    height: 28,
  },
  subscribeButton: {
    borderRadius: radii.lg,
  },
  bottomLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  linkText: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },
  legalLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
    marginBottom: 2,
  },
  legalLinkTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  legalLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  legalSeparator: {
    fontSize: 12,
  },
  legal: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  consentText: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: spacing.sm,
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
  activeProImage: {
    width: 56,
    height: 56,
  },
  activeSub: {
    ...typography.sizes.body,
    marginBottom: spacing.lg,
  },
  manageBtn: {
    minWidth: 200,
  },
});
