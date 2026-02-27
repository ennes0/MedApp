/**
 * Custom Animated Splash Screen
 * 
 * Animation sequence (3 seconds total):
 * 1. Black background fades in
 * 2. Top capsule half slides down from top (translateY + fade)
 * 3. Bottom capsule half slides up from bottom (translateY + fade)
 * 4. Plus signs burst outward (scale + fade)
 * 5. "MediMates" text fades in last
 */

import { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  // Animation values
  const backgroundOpacity = useSharedValue(0);
  const topCapsuleY = useSharedValue(-200);
  const topCapsuleOpacity = useSharedValue(0);
  const bottomCapsuleY = useSharedValue(200);
  const bottomCapsuleOpacity = useSharedValue(0);
  const plusScale = useSharedValue(1);
  const plusOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Sequence: Background -> Capsules -> Plus signs -> Text
    const animationDuration = 500;
    const easingConfig = { duration: animationDuration, easing: Easing.out(Easing.cubic) };

    // 1. Background fade in (0-500ms)
    backgroundOpacity.value = withTiming(1, { duration: 300 });

    // 2. Top capsule slides down (300-800ms)
    topCapsuleY.value = withDelay(300, withTiming(0, easingConfig));
    topCapsuleOpacity.value = withDelay(300, withTiming(1, easingConfig));

    // 3. Bottom capsule slides up (300-800ms)
    bottomCapsuleY.value = withDelay(300, withTiming(0, easingConfig));
    bottomCapsuleOpacity.value = withDelay(300, withTiming(1, easingConfig));

    // 4. Plus signs burst (800-1300ms)
    plusOpacity.value = withDelay(800, withTiming(1, { duration: 200 }));
    plusScale.value = withDelay(
      800,
      withSequence(
        withTiming(1.5, { duration: 300, easing: Easing.out(Easing.back(1.5)) }),
        withTiming(1, { duration: 200 })
      )
    );

    // 5. Text fades in (1500-2000ms)
    textOpacity.value = withDelay(1500, withTiming(1, { duration: 500 }));

    // Complete animation at 3000ms
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Animated styles
  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const topCapsuleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: topCapsuleY.value }],
    opacity: topCapsuleOpacity.value,
  }));

  const bottomCapsuleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bottomCapsuleY.value }],
    opacity: bottomCapsuleOpacity.value,
  }));

  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ scale: plusScale.value }],
    opacity: plusOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Black background */}
      <Animated.View style={[styles.background, backgroundStyle]} />

      {/* Centered content */}
      <View style={styles.content}>
        {/* Top capsule half (white) */}
        <Animated.View style={[styles.capsuleHalf, topCapsuleStyle]}>
          <View style={[styles.topHalf, styles.whiteCapsule]} />
        </Animated.View>

        {/* Plus signs in center */}
        <Animated.View style={[styles.plusContainer, plusStyle]}>
          <View style={styles.plusRow}>
            <View style={[styles.plus, styles.plusWhite]} />
            <View style={[styles.plus, styles.plusWhite]} />
          </View>
        </Animated.View>

        {/* Bottom capsule half (blue) */}
        <Animated.View style={[styles.capsuleHalf, bottomCapsuleStyle]}>
          <View style={[styles.bottomHalf, styles.blueCapsule]} />
        </Animated.View>

        {/* MediMates text */}
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Image
            source={require('../assets/images/2.png')}
            style={styles.fullLogo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    width: width * 0.6,
    height: height * 0.4,
  },
  capsuleHalf: {
    width: 120,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHalf: {
    width: 120,
    height: 60,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
  },
  bottomHalf: {
    width: 120,
    height: 60,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  whiteCapsule: {
    backgroundColor: '#FFFFFF',
  },
  blueCapsule: {
    backgroundColor: '#0a7ea4',
  },
  plusContainer: {
    width: 120,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: -10,
  },
  plusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  plus: {
    width: 20,
    height: 20,
  },
  plusWhite: {
    backgroundColor: '#FFFFFF',
  },
  textContainer: {
    marginTop: 40,
    width: 200,
    height: 60,
  },
  fullLogo: {
    width: '100%',
    height: '100%',
  },
});
