/**
 * Onboarding — Swipeable intro slides introducing MediMates
 *
 * 3 beautiful slides with animated illustrations:
 * 1. Track Your Medications
 * 2. Find Your MediMates
 * 3. Stay Healthy Together
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  type ViewToken,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Button } from '@/src/design-system/components/button';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: string;
  iconColor: string;
  gradientColors: [string, string];
  title: string;
  subtitle: string;
  features: { icon: string; text: string }[];
}

export default function OnboardingScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides: Slide[] = [
    {
      id: '1',
      icon: 'pill.fill',
      iconColor: c.primary,
      gradientColors: [c.primaryLight, c.background],
      title: 'Track Your\nMedications',
      subtitle: 'Add your medications, set smart reminders, and never miss a dose again.',
      features: [
        { icon: 'clock.fill', text: 'Custom reminders for each med' },
        { icon: 'checkmark.circle.fill', text: 'Log doses with one tap' },
        { icon: 'chart.bar.fill', text: 'Track your adherence' },
      ],
    },
    {
      id: '2',
      icon: 'heart.circle.fill',
      iconColor: c.success,
      gradientColors: [c.successLight, c.background],
      title: 'Find Your\nMediMates',
      subtitle: 'Connect with people on the same medications. Share tips, experiences, and support.',
      features: [
        { icon: 'person.2.fill', text: 'Match with others on same meds' },
        { icon: 'bubble.left.and.bubble.right.fill', text: 'Chat and share experiences' },
        { icon: 'hand.thumbsup.fill', text: 'Support each other\'s journey' },
      ],
    },
    {
      id: '3',
      icon: 'sparkles',
      iconColor: c.warning,
      gradientColors: [c.warningLight, c.background],
      title: 'Stay Healthy\nTogether',
      subtitle: 'Build healthy habits with smart insights and a caring community by your side.',
      features: [
        { icon: 'bell.badge.fill', text: 'Contextual smart notifications' },
        { icon: 'arrow.down.doc.fill', text: 'Export reports for your doctor' },
        { icon: 'lock.shield.fill', text: 'Your data stays private & secure' },
      ],
    },
  ];

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      router.push('/(auth)/welcome');
    }
  };

  const handleSkip = () => {
    router.push('/(auth)/welcome');
  };

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={item.gradientColors}
        style={styles.gradientBg}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      {/* Illustration area */}
      <View style={styles.illustrationArea}>
        {/* Floating decorative icons */}
        <MotiView
          from={{ opacity: 0, scale: 0.5, translateY: 20 }}
          animate={{ opacity: 0.15, scale: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 800, delay: 200 }}
          style={[styles.floatingIcon, styles.floatingTopLeft]}
        >
          <IconSymbol name="plus" size={28} color={item.iconColor} />
        </MotiView>
        <MotiView
          from={{ opacity: 0, scale: 0.5, translateY: -20 }}
          animate={{ opacity: 0.1, scale: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 800, delay: 400 }}
          style={[styles.floatingIcon, styles.floatingTopRight]}
        >
          <IconSymbol name="plus" size={20} color={item.iconColor} />
        </MotiView>
        <MotiView
          from={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.12, scale: 1 }}
          transition={{ type: 'timing', duration: 800, delay: 600 }}
          style={[styles.floatingIcon, styles.floatingBottomLeft]}
        >
          <IconSymbol name="cross.fill" size={16} color={item.iconColor} />
        </MotiView>

        {/* Main icon */}
        <MotiView
          from={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 100 }}
          key={`icon-${item.id}`}
        >
          <View style={[styles.mainIconCircle, { backgroundColor: item.iconColor + '18' }]}>
            <View style={[styles.mainIconInner, { backgroundColor: item.iconColor + '25' }]}>
              <IconSymbol name={item.icon as any} size={64} color={item.iconColor} />
            </View>
          </View>
        </MotiView>
      </View>

      {/* Content */}
      <View style={styles.slideContent}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 200 }}
          key={`title-${item.id}`}
        >
          <Text style={[styles.slideTitle, { color: c.textPrimary }]}>
            {item.title}
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 350 }}
          key={`subtitle-${item.id}`}
        >
          <Text style={[styles.slideSubtitle, { color: c.textSecondary }]}>
            {item.subtitle}
          </Text>
        </MotiView>

        {/* Feature pills */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 400, delay: 500 }}
          style={styles.featurePills}
          key={`features-${item.id}`}
        >
          {item.features.map((feature, i) => (
            <MotiView
              key={i}
              from={{ opacity: 0, translateX: -15 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 300, delay: 550 + i * 100 }}
            >
              <View style={[styles.featurePill, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
                <IconSymbol name={feature.icon as any} size={16} color={item.iconColor} />
                <Text style={[styles.featurePillText, { color: c.textPrimary }]}>
                  {feature.text}
                </Text>
              </View>
            </MotiView>
          ))}
        </MotiView>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Bottom controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* Page indicators */}
        <View style={styles.indicators}>
          {slides.map((_, i) => (
            <MotiView
              key={i}
              animate={{
                width: i === activeIndex ? 24 : 8,
                backgroundColor: i === activeIndex ? c.primary : c.border,
              }}
              transition={{ type: 'timing', duration: 250 }}
              style={styles.indicator}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {activeIndex < slides.length - 1 ? (
            <>
              <Button
                title="Skip"
                onPress={handleSkip}
                variant="ghost"
                size="md"
                style={styles.skipBtn}
              />
              <Button
                title="Next"
                onPress={handleNext}
                variant="primary"
                size="lg"
                style={styles.nextBtn}
              />
            </>
          ) : (
            <Button
              title="Get Started"
              onPress={handleNext}
              variant="primary"
              size="lg"
              fullWidth
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },

  // Illustration
  illustrationArea: {
    height: SCREEN_HEIGHT * 0.38,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mainIconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainIconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingIcon: {
    position: 'absolute',
  },
  floatingTopLeft: {
    top: '20%',
    left: '15%',
  },
  floatingTopRight: {
    top: '15%',
    right: '18%',
  },
  floatingBottomLeft: {
    bottom: '25%',
    left: '20%',
  },

  // Content
  slideContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  slideTitle: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.sm + 4,
  },
  slideSubtitle: {
    ...typography.sizes.body,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  featurePills: {
    gap: spacing.sm + 2,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.button,
    borderWidth: 1,
  },
  featurePillText: {
    ...typography.sizes.subhead,
    fontWeight: '500',
  },

  // Bottom
  bottomControls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skipBtn: {
    flex: 0,
    minWidth: 80,
  },
  nextBtn: {
    flex: 1,
  },
});
