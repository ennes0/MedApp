/**
 * Updated: no glow oval, angled top half, closer + brighter sparkles
 */

import { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

interface Sparkle {
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  size: number;
  delay: number;
}

// ── Sparkles closer to pill edge, brighter color ──
const SPARKLES: Sparkle[] = [
  { startX: 1,  startY: -10, driftX: 18, driftY: -24, size: 16, delay: 0 },
  { startX: 4,  startY: 3,   driftX: 14, driftY: -18, size: 12, delay: 70 },
  { startX: -1, startY: -20, driftX: 10, driftY: -28, size: 10, delay: 160 },
  { startX: 6,  startY: -15, driftX: 8,  driftY: -32, size: 8,  delay: 120 },
  { startX: -2, startY: 10,  driftX: 16, driftY: -14, size: 7,  delay: 210 },
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
          Animated.parallel([
            Animated.spring(particleScale, {
              toValue: 1, friction: 7, tension: 120, useNativeDriver: true,
            }),
            Animated.timing(particleOpacity, {
              toValue: 1, duration: 240,
              easing: Easing.out(Easing.cubic), useNativeDriver: true,
            }),
            Animated.timing(driftX, {
              toValue: sparkle.driftX, duration: 900,
              easing: Easing.out(Easing.quad), useNativeDriver: true,
            }),
            Animated.timing(driftY, {
              toValue: sparkle.driftY, duration: 900,
              easing: Easing.out(Easing.quad), useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(particleOpacity, {
              toValue: 0, duration: 450,
              easing: Easing.in(Easing.cubic), useNativeDriver: true,
            }),
            Animated.timing(particleScale, {
              toValue: 0.3, duration: 450,
              easing: Easing.in(Easing.cubic), useNativeDriver: true,
            }),
          ]),
        ]).start();
      }
    });
    return () => trigger.removeListener(listenerId);
  }, []);

  const armLength = sparkle.size * 0.68;
  const armThick = Math.max(2.5, sparkle.size * 0.28);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        // Closer to the pill — startX is now 0-6 instead of 8-20
        left: PILL_W + sparkle.startX,
        top: HALF_H + sparkle.startY - sparkle.size / 2,
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
      {/* Horizontal bar — brighter white-blue */}
      <View style={{
        position: 'absolute',
        top: (sparkle.size - armThick) / 2,
        left: (sparkle.size - armLength) / 2,
        width: armLength,
        height: armThick,
        borderRadius: armThick / 2,
        backgroundColor: '#90DEFF',
        // Glow via shadow
        shadowColor: '#4AABDB',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
        elevation: 4,
      }} />
      {/* Vertical bar */}
      <View style={{
        position: 'absolute',
        left: (sparkle.size - armThick) / 2,
        top: (sparkle.size - armLength) / 2,
        width: armThick,
        height: armLength,
        borderRadius: armThick / 2,
        backgroundColor: '#90DEFF',
        shadowColor: '#4AABDB',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
        elevation: 4,
      }} />
    </Animated.View>
  );
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const topY = useRef(new Animated.Value(0)).current;
  const botY = useRef(new Animated.Value(0)).current;
  // NEW: rotation for the top half — pivots like a real pill cap
  const topRotate = useRef(new Animated.Value(0)).current;
  const pillRotate = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const sparkleTrigger = useRef(new Animated.Value(0)).current;

  const pillRotateInterp = pillRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  // Top half tilts as it opens — pivot from bottom center (offset trick)
  const topRotateInterp = topRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-13deg'],
  });

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {});

    Animated.sequence([
      // 1. Pill appears
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1, friction: 10, tension: 60, useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1, duration: 600,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
      // 2. Brief hold
      Animated.delay(300),
      // 3. Wobble then open
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pillRotate, {
            toValue: 1, duration: 80,
            easing: Easing.inOut(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(pillRotate, {
            toValue: -1, duration: 80,
            easing: Easing.inOut(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(pillRotate, {
            toValue: 0.6, duration: 70,
            easing: Easing.inOut(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(pillRotate, {
            toValue: -0.4, duration: 60,
            easing: Easing.inOut(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(pillRotate, {
            toValue: 0, duration: 60,
            easing: Easing.out(Easing.quad), useNativeDriver: true,
          }),
          // Halves separate — top moves up AND rotates
          Animated.parallel([
            Animated.spring(topY, {
              toValue: -32, friction: 12, tension: 40, useNativeDriver: true,
            }),
            // NEW: top half tilts as it opens
            Animated.spring(topRotate, {
              toValue: 1, friction: 12, tension: 40, useNativeDriver: true,
            }),
            Animated.spring(botY, {
              toValue: 30, friction: 12, tension: 40, useNativeDriver: true,
            }),
          ]),
        ]),
        // Sparkles burst when pill starts opening
        Animated.sequence([
          Animated.delay(350),
          Animated.timing(sparkleTrigger, {
            toValue: 1, duration: 1, useNativeDriver: true,
          }),
        ]),
      ]),
      // 4. Hold open
      Animated.delay(600),
      // 5. Text fades in
      Animated.timing(textOpacity, {
        toValue: 1, duration: 600,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      // 6. Hold
      Animated.delay(1000),
      // 7. Fade out
      Animated.timing(screenOpacity, {
        toValue: 0, duration: 700,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
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
          {/* Top half — white, tilts as it opens */}
          <Animated.View
            style={[
              styles.topHalf,
              {
                transform: [
                  // Shift pivot to bottom edge, rotate, shift back
                  { translateY: HALF_H / 2 },
                  { rotate: topRotateInterp },
                  { translateY: -(HALF_H / 2) },
                  // Then move up
                  { translateY: topY },
                ],
              },
            ]}
          />

          {/* Bottom half — brand blue, moves straight down */}
          <Animated.View
            style={[styles.botHalf, { transform: [{ translateY: botY }] }]}
          />

          {/* Sparkle particles */}
          {SPARKLES.map((s, i) => (
            <SparkleParticle key={i} sparkle={s} trigger={sparkleTrigger} />
          ))}
        </Animated.View>
      </View>

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
  title: {
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: 3,
    fontFamily: 'Georgia',
  },
});