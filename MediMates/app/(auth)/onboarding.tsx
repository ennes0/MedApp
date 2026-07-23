/**
 * Onboarding — Swipeable intro slides introducing MediMates
 *
 * Visual direction inspired by playful poster-style onboarding.
 * 1. Track Your Medications
 * 2. Find Your MediMates
 * 3. Stay Healthy Together
 */

import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  type ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { SvgUri } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { Button } from '@/src/design-system/components/button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Slide {
  id: string;
  bgColor: string;
  heroAccent: string;
  illustrationUri: string;
  title: string;
  subtitle: string;
  cta: string;
}

export default function OnboardingScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const addFriendsSvgUri = Image.resolveAssetSource(
    require('@/assets/images/undraw_add-friends_v4kx.svg'),
  ).uri;
  const medicalCareSvgUri = Image.resolveAssetSource(
    require('@/assets/images/undraw_medical-care_7m9g.svg'),
  ).uri;
  const reportSvgUri = Image.resolveAssetSource(
    require('@/assets/images/undraw_report_k55w.svg'),
  ).uri;

  const slides: Slide[] = useMemo(
    () => [
      {
        id: '1',
        bgColor: c.primaryLight,
        heroAccent: c.primary + '26',
        illustrationUri: medicalCareSvgUri,
        title: t('onboarding.slide1Title'),
        subtitle: t('onboarding.slide1Subtitle'),
        cta: t('onboarding.next'),
      },
      {
        id: '2',
        bgColor: c.successLight,
        heroAccent: c.success + '24',
        illustrationUri: addFriendsSvgUri,
        title: t('onboarding.slide2Title'),
        subtitle: t('onboarding.slide2Subtitle'),
        cta: t('onboarding.next'),
      },
      {
        id: '3',
        bgColor: c.warningLight,
        heroAccent: c.warning + '2A',
        illustrationUri: reportSvgUri,
        title: t('onboarding.slide3Title'),
        subtitle: t('onboarding.slide3Subtitle'),
        cta: t('onboarding.getStarted'),
      },
    ],
    [addFriendsSvgUri, c, medicalCareSvgUri, reportSvgUri, t],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = async () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      // Final slide — complete onboarding and navigate
      setIsProcessing(true);
      try {
        // TODO: Add backend API call here to mark onboarding_completed = true
        // Example: await api.updateMe({ onboarding_completed: true });
        
        // Simulate completion time to show loading
        await new Promise(resolve => setTimeout(resolve, 800));
        
        console.log('[Onboarding] Completed, navigating to welcome...');
        router.replace('/(auth)/welcome');
      } catch (error) {
        console.error('[Onboarding] Error:', error);
        setIsProcessing(false);
      }
    }
  };

  const handleSkip = async () => {
    setIsProcessing(true);
    try {
      // TODO: Add backend API call here if needed for skip tracking
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log('[Onboarding] Skipped, navigating to welcome...');
      router.replace('/(auth)/welcome');
    } catch (error) {
      console.error('[Onboarding] Skip error:', error);
      setIsProcessing(false);
    }
  };

  const renderSlide = ({ item }: { item: Slide; index: number }) => {
    const isLast = activeIndex === slides.length - 1;
    return (
      <View style={[styles.slide, { width: SCREEN_WIDTH, backgroundColor: item.bgColor }]}>
        <View style={styles.heroZone}>
          <MotiView
            from={{ opacity: 0, scale: 0.84, translateY: 28 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 13, stiffness: 95 }}
            style={styles.heroWrap}
          >
            <View style={[styles.accentCircle, { backgroundColor: item.heroAccent }]} />
            <View style={styles.posterCenter}>
              <SvgUri uri={item.illustrationUri} width="100%" height="100%" />
            </View>
          </MotiView>
        </View>

        <View style={styles.textZone}>
          <Text style={[styles.slideTitle, { color: c.textPrimary }]}>{item.title}</Text>
          <Text style={[styles.slideSubtitle, { color: c.textSecondary }]}>{item.subtitle}</Text>
        </View>

        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + spacing.md }]}> 
          <View style={styles.indicators}>
            {slides.map((_, i) => (
              <MotiView
                key={i}
                animate={{
                  width: i === activeIndex ? 22 : 7,
                  backgroundColor: i === activeIndex ? c.textPrimary : c.textTertiary,
                  opacity: i === activeIndex ? 1 : 0.55,
                }}
                transition={{ type: 'timing', duration: 220 }}
                style={styles.indicator}
              />
            ))}
          </View>

          <Button
            title={item.cta}
            onPress={handleNext}
            variant="primary"
            size="lg"
            fullWidth
            disabled={isProcessing}
            style={[styles.primaryCta, { backgroundColor: c.primary }]}
          />

          {!isLast ? (
            <Text
              onPress={isProcessing ? undefined : handleSkip}
              style={[styles.skipText, { color: c.textSecondary }, isProcessing && { opacity: 0.5 }]}
            >
              {t('onboarding.skip')}
            </Text>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>
      </View>
    );
  };

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
  heroZone: {
    flex: 0.54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroWrap: {
    width: SCREEN_WIDTH * 0.88,
    height: SCREEN_WIDTH * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentCircle: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.58,
    height: SCREEN_WIDTH * 0.58,
    borderRadius: 999,
    top: SCREEN_WIDTH * 0.16,
  },
  posterCenter: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textZone: {
    flex: 0.24,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  slideTitle: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  slideSubtitle: {
    ...typography.sizes.callout,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 330,
  },

  bottomControls: {
    flex: 0.22,
    paddingHorizontal: spacing.lg,
    justifyContent: 'flex-end',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  indicator: {
    height: 6,
    borderRadius: 3,
  },
  primaryCta: {
    minHeight: 48,
    borderRadius: radii.full,
  },
  skipText: {
    ...typography.sizes.footnote,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  skipPlaceholder: {
    height: 20,
    marginTop: spacing.sm,
  },
});
