/**
 * DiscoverCard — Swipeable profile card for the Mates discover feed.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Avatar } from '@/src/design-system/components/avatar';
import { Chip } from '@/src/design-system/components/chip';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { DiscoverProfile } from '@/src/types/firebase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface DiscoverCardProps {
  profile: DiscoverProfile;
  onLike: () => void;
  onPass: () => void;
}

export function DiscoverCard({ profile, onLike, onPass }: DiscoverCardProps) {
  const c = useColors();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.4;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { damping: 20 });
        runOnJS(onLike)();
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { damping: 20 });
        runOnJS(onPass)();
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
          [-15, 0, 15],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, { backgroundColor: c.card, ...shadows.lg }, animatedStyle]}>
        {/* Like / Pass labels */}
        <Animated.View style={[styles.stampContainer, styles.likeStamp, likeOpacity]}>
          <Text style={styles.stampText}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.stampContainer, styles.passStamp, passOpacity]}>
          <Text style={[styles.stampText, { color: '#FF3B30' }]}>PASS</Text>
        </Animated.View>

        {/* Content */}
        <View style={styles.avatarContainer}>
          <Avatar
            name={profile.displayName}
            imageUrl={profile.avatarUrl}
            size="lg"
          />
        </View>

        <Text style={[styles.name, { color: c.textPrimary }]}>
          {profile.displayName}, {profile.age}
        </Text>

        {profile.bio ? (
          <Text style={[styles.bio, { color: c.textSecondary }]}>
            {profile.bio}
          </Text>
        ) : null}

        {/* Shared meds */}
        <View style={styles.medsRow}>
          {profile.visibleMeds.map((med) => (
            <Chip key={med} label={med} selected={false} />
          ))}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    borderRadius: radii.sheet,
    padding: spacing.xl,
    alignItems: 'center',
    position: 'absolute',
    alignSelf: 'center',
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  name: {
    ...typography.sizes.title3,
    marginBottom: 4,
  },
  bio: {
    ...typography.sizes.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  medsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  stampContainer: {
    position: 'absolute',
    top: spacing.xl,
    zIndex: 10,
    borderWidth: 3,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  likeStamp: {
    left: spacing.lg,
    borderColor: '#34C759',
    transform: [{ rotate: '-15deg' }],
  },
  passStamp: {
    right: spacing.lg,
    borderColor: '#FF3B30',
    transform: [{ rotate: '15deg' }],
  },
  stampText: {
    ...typography.sizes.title3,
    fontWeight: '800',
    color: '#34C759',
  },
});
