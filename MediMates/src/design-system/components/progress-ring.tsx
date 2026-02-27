/**
 * ProgressRing — Animated circular SVG progress indicator
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  useDerivedValue,
} from 'react-native-reanimated';
import { useColors } from '../theme-provider';
import { typography, motion } from '../tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** 0–1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
  color?: string;
}

export function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 6,
  showLabel = true,
  label,
  color,
}: ProgressRingProps) {
  const c = useColors();
  const ringColor = color ?? c.primary;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(
      Math.min(Math.max(progress, 0), 1),
      { duration: motion.durations.slow },
    );
  }, [progress, animatedProgress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset =
      circumference * (1 - animatedProgress.value);
    return { strokeDashoffset };
  });

  const percentage = Math.round(progress * 100);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={c.surface}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated foreground */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.label,
              {
                color: c.textPrimary,
                fontSize: size > 48 ? 14 : 10,
              },
            ]}
          >
            {label ?? `${percentage}%`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: '700',
    ...typography.tabularNums,
  },
});
