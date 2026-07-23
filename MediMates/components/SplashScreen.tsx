/**
 * MedMates Splash Screen — v2
 * Gerçekçi kapsül görünümü: gloss/highlight, seam çizgisi, dinamik gölge,
 * daha yumuşak (organik) sparkle yörüngeleri ve hafif 3D "twist" hissi.
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

const PILL_W = 110;
const PILL_H = 170;
const HALF_H = PILL_H / 2;

// Sparklar artık pilin sağ kenarı boyunca daha organik bir yay çiziyor
const SPARKLES: Sparkle[] = [
  { startX: 2, startY: -18, driftX: 20, driftY: -26, size: 15, delay: 0 },
  { startX: 6, startY: 2, driftX: 16, driftY: -16, size: 11, delay: 60 },
  { startX: -2, startY: -28, driftX: 12, driftY: -30, size: 9, delay: 150 },
  { startX: 8, startY: -12, driftX: 10, driftY: -34, size: 8, delay: 110 },
  { startX: 0, startY: 14, driftX: 18, driftY: -12, size: 7, delay: 200 },
  { startX: 10, startY: -22, driftX: 6, driftY: -20, size: 6, delay: 240 },
];

// Yay şeklinde ("bounce-out" hissi veren) özel easing
const easeOutBack = Easing.bezier(0.34, 1.56, 0.64, 1);
const easeOutExpo = Easing.bezier(0.22, 1, 0.36, 1);

function SparkleParticle({ sparkle, trigger }: { sparkle: Sparkle; trigger: Animated.Value }) {
  const particleScale = useRef(new Animated.Value(0)).current;
  const particleOpacity = useRef(new Animated.Value(0)).current;
  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const listenerId = trigger.addListener(({ value }) => {
      if (value === 1) {
        Animated.sequence([
          Animated.delay(sparkle.delay),
          Animated.parallel([
            Animated.spring(particleScale, {
              toValue: 1, friction: 6, tension: 140, useNativeDriver: true,
            }),
            Animated.timing(particleOpacity, {
              toValue: 1, duration: 200,
              easing: Easing.out(Easing.cubic), useNativeDriver: true,
            }),
            Animated.timing(driftX, {
              toValue: sparkle.driftX, duration: 850,
              easing: easeOutExpo, useNativeDriver: true,
            }),
            Animated.timing(driftY, {
              toValue: sparkle.driftY, duration: 850,
              easing: easeOutExpo, useNativeDriver: true,
            }),
            Animated.timing(spin, {
              toValue: 1, duration: 850,
              easing: Easing.out(Easing.quad), useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(particleOpacity, {
              toValue: 0, duration: 400,
              easing: Easing.in(Easing.cubic), useNativeDriver: true,
            }),
            Animated.timing(particleScale, {
              toValue: 0.2, duration: 400,
              easing: Easing.in(Easing.cubic), useNativeDriver: true,
            }),
          ]),
        ]).start();
      }
    });
    return () => trigger.removeListener(listenerId);
  }, []);

  const armLength = sparkle.size * 0.7;
  const armThick = Math.max(2.5, sparkle.size * 0.26);
  const rotateInterp = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '35deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: PILL_W + sparkle.startX,
        top: HALF_H + sparkle.startY - sparkle.size / 2,
        width: sparkle.size,
        height: sparkle.size,
        opacity: particleOpacity,
        transform: [
          { scale: particleScale },
          { translateX: driftX },
          { translateY: driftY },
          { rotate: rotateInterp },
        ],
      }}
    >
      <View style={{
        position: 'absolute',
        top: (sparkle.size - armThick) / 2,
        left: (sparkle.size - armLength) / 2,
        width: armLength,
        height: armThick,
        borderRadius: armThick / 2,
        backgroundColor: '#AEE9FF',
        shadowColor: '#4AABDB',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 7,
        elevation: 5,
      }} />
      <View style={{
        position: 'absolute',
        left: (sparkle.size - armThick) / 2,
        top: (sparkle.size - armLength) / 2,
        width: armThick,
        height: armLength,
        borderRadius: armThick / 2,
        backgroundColor: '#AEE9FF',
        shadowColor: '#4AABDB',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 7,
        elevation: 5,
      }} />
    </Animated.View>
  );
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const topY = useRef(new Animated.Value(0)).current;
  const botY = useRef(new Animated.Value(0)).current;
  const topRotate = useRef(new Animated.Value(0)).current;
  const pillRotate = useRef(new Animated.Value(0)).current;
  const shadowScale = useRef(new Animated.Value(1)).current;
  const shadowOpacity = useRef(new Animated.Value(0.55)).current;
  const seamOpacity = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(8)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const sparkleTrigger = useRef(new Animated.Value(0)).current;

  const pillRotateInterp = pillRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  const topRotateInterp = topRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-15deg'],
  });

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {});

    Animated.sequence([
      // 1. Pill belirir — hafif "pop" ile (overshoot)
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1, duration: 650,
          easing: easeOutBack, useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1, duration: 500,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
      Animated.delay(280),
      // 2. Wobble + açılış + gölge tepkisi aynı anda
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pillRotate, {
            toValue: 1, duration: 75, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(pillRotate, {
            toValue: -0.8, duration: 75, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(pillRotate, {
            toValue: 0.5, duration: 65, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(pillRotate, {
            toValue: 0, duration: 65, easing: Easing.out(Easing.quad), useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(topY, {
              toValue: -34, duration: 700, easing: easeOutExpo, useNativeDriver: true,
            }),
            Animated.timing(topRotate, {
              toValue: 1, duration: 700, easing: easeOutExpo, useNativeDriver: true,
            }),
            Animated.timing(botY, {
              toValue: 32, duration: 700, easing: easeOutExpo, useNativeDriver: true,
            }),
            Animated.timing(seamOpacity, {
              toValue: 0, duration: 200, useNativeDriver: true,
            }),
            Animated.timing(shadowScale, {
              toValue: 1.25, duration: 700, easing: easeOutExpo, useNativeDriver: true,
            }),
            Animated.timing(shadowOpacity, {
              toValue: 0.3, duration: 700, easing: easeOutExpo, useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(320),
          Animated.timing(sparkleTrigger, { toValue: 1, duration: 1, useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(500),
      // 3. Yazı yukarıdan hafif kayarak belirir
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(textY, {
          toValue: 0, duration: 550, easing: easeOutExpo, useNativeDriver: true,
        }),
      ]),
      Animated.delay(1000),
      Animated.timing(screenOpacity, {
        toValue: 0, duration: 700,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
    ]).start(() => onAnimationComplete());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <View style={styles.pillArea}>
        {/* Dinamik gölge — pil açılırken genişler ve hafifler */}
        <Animated.View
          style={[
            styles.shadow,
            {
              opacity: shadowOpacity,
              transform: [{ scale: shadowScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.pill,
            {
              opacity,
              transform: [{ scale }, { rotate: pillRotateInterp }],
            },
          ]}
        >
          {/* Üst yarım — beyaz, gloss highlight ile */}
          <Animated.View
            style={[
              styles.topHalf,
              {
                transform: [
                  { translateY: HALF_H / 2 },
                  { rotate: topRotateInterp },
                  { translateY: -(HALF_H / 2) },
                  { translateY: topY },
                ],
              },
            ]}
          >
            <View style={styles.topGloss} />
          </Animated.View>

          {/* Alt yarım — mavi, iç gölge ile derinlik hissi */}
          <Animated.View style={[styles.botHalf, { transform: [{ translateY: botY }] }]}>
            <View style={styles.botInnerShade} />
          </Animated.View>

          {/* Seam — iki yarı birleşirken görünen ince çizgi, açılınca kaybolur */}
          <Animated.View style={[styles.seam, { opacity: seamOpacity }]} />

          {SPARKLES.map((s, i) => (
            <SparkleParticle key={i} sparkle={s} trigger={sparkleTrigger} />
          ))}
        </Animated.View>
      </View>

      <Animated.Text
        style={[
          styles.title,
          { opacity: textOpacity, transform: [{ translateY: textY }] },
        ]}
      >
        MedMates
      </Animated.Text>
    </Animated.View>
  );
}

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
  shadow: {
    position: 'absolute',
    bottom: -22,
    width: 90,
    height: 18,
    borderRadius: 45,
    backgroundColor: '#000000',
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
    backgroundColor: '#F4F6F8',
    borderTopLeftRadius: PILL_W / 2,
    borderTopRightRadius: PILL_W / 2,
    overflow: 'hidden',
  },
  topGloss: {
    position: 'absolute',
    top: 8,
    left: 12,
    width: 22,
    height: 55,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    transform: [{ rotate: '-8deg' }],
  },
  botHalf: {
    position: 'absolute',
    bottom: 0,
    width: PILL_W,
    height: HALF_H,
    backgroundColor: '#3E9BD1',
    borderBottomLeftRadius: PILL_W / 2,
    borderBottomRightRadius: PILL_W / 2,
    overflow: 'hidden',
  },
  botInnerShade: {
    position: 'absolute',
    top: 0,
    width: PILL_W,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  seam: {
    position: 'absolute',
    top: HALF_H - 2.5,
    left: 8,
    width: PILL_W - 16,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: 3,
    fontFamily: 'Baskerville',
  },
});