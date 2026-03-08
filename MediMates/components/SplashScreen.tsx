/**
 * Custom Animated Splash Screen — Pill Opening Animation with Sparkles
 *
 * Animation sequence (~4s total):
 * 1. Capsule pill appears with smooth spring scale + fade (0-600ms)
 * 2. Short hold (600-900ms)
 * 3. Pill wobbles (resist), then opens — halves separate (900-1600ms)
 * 4. Sparkle "+" particles burst from gap, float upward, then fade out (1100-2400ms)
 * 5. "MediMates" text fades in (2000-2600ms)
 * 6. Hold on screen (2600-3600ms)
 * 7. Entire screen fades out (3600-4200ms) → onAnimationComplete
 *
 * Uses only RN core Animated API — no extra packages needed.
 */

import { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

// ── Sparkle config ──
// Positions relative to pill center-right, closer to the capsule
interface Sparkle {
  startX: number;   // horizontal offset from pill right edge
  startY: number;   // vertical offset from pill center
  driftX: number;   // how far it drifts right
  driftY: number;   // how far it drifts up (negative = up)
  size: number;
  delay: number;
}

const SPARKLES: Sparkle[] = [
  { startX: 8,  startY: -8,  driftX: 22, driftY: -18, size: 16, delay: 0 },
  { startX: 14, startY: 4,   driftX: 18, driftY: -14, size: 11, delay: 100 },
  { startX: 4,  startY: -22, driftX: 16, driftY: -20, size: 9,  delay: 200 },
  { startX: 20, startY: -14, driftX: 14, driftY: -24, size: 7,  delay: 150 },
  { startX: 2,  startY: 12,  driftX: 20, driftY: -10, size: 6,  delay: 250 },
];

function SparkleParticle({ sparkle, trigger }: { sparkle: Sparkle; trigger: Animated.Value }) {
  const particleScale = useRef(new Animated.Value(0)).current;
  const particleOpacity = useRef(new Animated.Value(0)).current;
  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const listenerId = trigger.addListener(({ value }) => {
      if (value === 1) {
        Animated.sequence([
          Animated.delay(sparkle.delay),
          // Phase 1: appear + start drifting
          Animated.parallel([
            Animated.spring(particleScale, {
              toValue: 1,
              friction: 7,
              tension: 120,
              useNativeDriver: true,
            }),
            Animated.timing(particleOpacity, {
              toValue: 1,
              duration: 250,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(driftX, {
              toValue: sparkle.driftX,
              duration: 900,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(driftY, {
              toValue: sparkle.driftY,
              duration: 900,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          // Phase 2: fade out smoothly while still drifting
          Animated.parallel([
            Animated.timing(particleOpacity, {
              toValue: 0,
              duration: 500,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(particleScale, {
              toValue: 0.3,
              duration: 500,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }
    });
    return () => trigger.removeListener(listenerId);
  }, []);

  const armLength = sparkle.size * 0.6;
  const armThick = Math.max(2, sparkle.size * 0.24);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        right: -PILL_W / 2 - sparkle.startX,
        top: PILL_H / 2 + sparkle.startY - sparkle.size / 2,
        width: sparkle.size,
        height: sparkle.size,
        opacity: particleOpacity,
        transform: [
          { scale: particleScale },
          { translateX: driftX },
          { translateY: driftY },
        ],
      }}
    >
      {/* Horizontal bar */}
      <View
        style={{
          position: 'absolute',
          top: (sparkle.size - armThick) / 2,
          left: (sparkle.size - armLength) / 2,
          width: armLength,
          height: armThick,
          borderRadius: armThick / 2,
          backgroundColor: '#4AABDB',
        }}
      />
      {/* Vertical bar */}
      <View
        style={{
          position: 'absolute',
          left: (sparkle.size - armThick) / 2,
          top: (sparkle.size - armLength) / 2,
          width: armThick,
          height: armLength,
          borderRadius: armThick / 2,
          backgroundColor: '#4AABDB',
        }}
      />
    </Animated.View>
  );
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const topY = useRef(new Animated.Value(0)).current;
  const botY = useRef(new Animated.Value(0)).current;
  const pillRotate = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const sparkleTrigger = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const pillRotateInterp = pillRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {});

    Animated.sequence([
      // 1. Pill appears — smooth spring + fade
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 10,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // 2. Brief hold
      Animated.delay(300),
      // 3. Pill wobbles (like resisting), then opens
      Animated.parallel([
        // Wobble — shake left-right subtly
        Animated.sequence([
          Animated.timing(pillRotate, {
            toValue: 1,
            duration: 80,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pillRotate, {
            toValue: -1,
            duration: 80,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pillRotate, {
            toValue: 0.6,
            duration: 70,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pillRotate, {
            toValue: -0.4,
            duration: 60,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pillRotate, {
            toValue: 0,
            duration: 60,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          // Now separate after wobble
          Animated.parallel([
            Animated.spring(topY, {
              toValue: -18,
              friction: 12,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.spring(botY, {
              toValue: 18,
              friction: 12,
              tension: 40,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Subtle glow behind gap (starts during wobble)
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        // Trigger sparkles when pill starts opening
        Animated.sequence([
          Animated.delay(350),
          Animated.timing(sparkleTrigger, {
            toValue: 1,
            duration: 1,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // 4. Hold open — sparkles are floating & fading during this time
      Animated.delay(600),
      // 5. Text fades in smoothly
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // 6. Hold on screen
      Animated.delay(1000),
      // 7. Entire screen fades out
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 700,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => onAnimationComplete());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <View style={styles.pillArea}>
        <Animated.View
          style={[
            styles.pill,
            {
              opacity,
              transform: [
                { scale },
                { rotate: pillRotateInterp },
              ],
            },
          ]}
        >
          {/* Glow behind the gap */}
          <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

          {/* Top half — white */}
          <Animated.View
            style={[styles.topHalf, { transform: [{ translateY: topY }] }]}
          />
          {/* Bottom half — brand blue */}
          <Animated.View
            style={[styles.botHalf, { transform: [{ translateY: botY }] }]}
          />

          {/* Sparkle particles */}
          {SPARKLES.map((s, i) => (
            <SparkleParticle key={i} sparkle={s} trigger={sparkleTrigger} />
          ))}
        </Animated.View>
      </View>

      {/* Brand text */}
      <Animated.Text style={[styles.title, { opacity: textOpacity }]}>
        MedMates
      </Animated.Text>
    </Animated.View>
  );
}

const PILL_W = 110;
const PILL_H = 170;
const HALF_H = PILL_H / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillArea: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: PILL_W,
    height: PILL_H,
  },
  topHalf: {
    position: 'absolute',
    top: 0,
    width: PILL_W,
    height: HALF_H,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: PILL_W / 2,
    borderTopRightRadius: PILL_W / 2,
  },
  botHalf: {
    position: 'absolute',
    bottom: 0,
    width: PILL_W,
    height: HALF_H,
    backgroundColor: '#4AABDB',
    borderBottomLeftRadius: PILL_W / 2,
    borderBottomRightRadius: PILL_W / 2,
  },
  glow: {
    position: 'absolute',
    top: HALF_H - 20,
    left: -15,
    width: PILL_W + 30,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 171, 219, 0.15)',
  },
  title: {
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: 3,
    fontFamily: 'Georgia',
  },
});
