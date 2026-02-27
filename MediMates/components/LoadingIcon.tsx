/**
 * Loading Icon Component - For loading states
 * Uses the capsule icon only (1.png)
 * Includes a subtle pulse animation
 */

import { useEffect } from 'react';
import { Image, StyleSheet, ImageStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface LoadingIconProps {
  size?: number;
  style?: ImageStyle;
}

export function LoadingIcon({ size = 40, style }: LoadingIconProps) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Pulse animation
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, { width: size, height: size }]}>
      <Image
        source={require('../assets/images/1.png')}
        style={[styles.icon, { width: size, height: size }, style]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: '100%',
    height: '100%',
  },
});
