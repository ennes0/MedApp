/**
 * Custom Animated Splash Screen
 *
 * Animation sequence (3 seconds total):
 * 1. Black background fades in instantly
 * 2. Top white capsule half slides down from above (300-700ms)
 * 3. Bottom blue capsule half slides up from below (400-800ms, slight overlap)
 * 4. Plus signs burst outward with spring (900-1200ms)
 * 5. Logo image scales up & fades in (1400-2200ms)
 * 6. Hold until 3000ms then complete
 */

import { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Capsule dimensions — larger for visual impact
const CAPSULE_W = 160;
const CAPSULE_H = 80;

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  // Animation values
  const backgroundOpacity = useSharedValue(0);
  const topCapsuleY = useSharedValue(-height * 0.35);
  const topCapsuleOpacity = useSharedValue(0);
  const bottomCapsuleY = useSharedValue(height * 0.35);
  const bottomCapsuleOpacity = useSharedValue(0);
  const plusScale = useSharedValue(0.3);
  const plusOpacity = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.7);

  useEffect(() => {
    // 1. Background instant
    backgroundOpacity.value = withTiming(1, { duration: 200 });

    // 2. Top capsule slides down (300-700ms)
    topCapsuleOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }),
    );
    topCapsuleY.value = withDelay(
      300,
      withSpring(0, { damping: 16, stiffness: 120, mass: 0.8 }),
    );

    // 3. Bottom capsule slides up (400-800ms, slight overlap)
    bottomCapsuleOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }),
    );
    bottomCapsuleY.value = withDelay(
      400,
      withSpring(0, { damping: 16, stiffness: 120, mass: 0.8 }),
    );

    // 4. Plus signs burst (900-1200ms)
    plusOpacity.value = withDelay(
      900,
      withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
    );
    plusScale.value = withDelay(
      900,
      withSequence(
        withSpring(1.6, { damping: 8, stiffness: 200, mass: 0.6 }),
        withSpring(1, { damping: 12, stiffness: 150 }),
      ),
    );

    // 5. Logo fades in & scales (1400-2200ms)
    logoOpacity.value = withDelay(
      1400,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
    logoScale.value = withDelay(
      1400,
      withSpring(1, { damping: 14, stiffness: 100, mass: 0.8 }),
    );

    // Complete at 3000ms
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

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
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
            <View style={styles.plusShape}>
              <View style={[styles.plusH, styles.plusWhite]} />
              <View style={[styles.plusV, styles.plusWhite]} />
            </View>
            <View style={styles.plusShape}>
              <View style={[styles.plusH, styles.plusWhite]} />
              <View style={[styles.plusV, styles.plusWhite]} />
            </View>
          </View>
        </Animated.View>

        {/* Bottom capsule half (blue) */}
        <Animated.View style={[styles.capsuleHalf, bottomCapsuleStyle]}>
          <View style={[styles.bottomHalf, styles.blueCapsule]} />
        </Animated.View>

        {/* Logo image */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
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
    width: width * 0.7,
    height: height * 0.5,
  },
  capsuleHalf: {
    width: CAPSULE_W,
    height: CAPSULE_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHalf: {
    width: CAPSULE_W,
    height: CAPSULE_H,
    borderTopLeftRadius: CAPSULE_W / 2,
    borderTopRightRadius: CAPSULE_W / 2,
  },
  bottomHalf: {
    width: CAPSULE_W,
    height: CAPSULE_H,
    borderBottomLeftRadius: CAPSULE_W / 2,
    borderBottomRightRadius: CAPSULE_W / 2,
  },
  whiteCapsule: {
    backgroundColor: '#FFFFFF',
  },
  blueCapsule: {
    backgroundColor: '#0a7ea4',
  },
  plusContainer: {
    width: CAPSULE_W,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: -12,
    zIndex: 10,
  },
  plusRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
  },
  plusShape: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusH: {
    position: 'absolute',
    width: 24,
    height: 6,
    borderRadius: 3,
  },
  plusV: {
    position: 'absolute',
    width: 6,
    height: 24,
    borderRadius: 3,
  },
  plusWhite: {
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    marginTop: 48,
    width: 260,
    height: 80,
  },
  fullLogo: {
    width: '100%',
    height: '100%',
  },
});
