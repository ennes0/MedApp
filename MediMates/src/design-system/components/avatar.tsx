/**
 * Avatar — Circular image with fallback initials
 *
 * Sizes: sm (32), md (40), lg (56)
 */

import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '../theme-provider';
import { typography } from '../tokens';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  showOnline?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
};

const fontSizeMap: Record<AvatarSize, number> = {
  sm: 12,
  md: 15,
  lg: 20,
};

const onlineDotMap: Record<AvatarSize, number> = {
  sm: 8,
  md: 10,
  lg: 14,
};

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({
  uri,
  name,
  size = 'md',
  showOnline = false,
  style,
}: AvatarProps) {
  const c = useColors();
  const dim = sizeMap[size];
  const initials = getInitials(name);

  return (
    <View
      style={[
        { width: dim, height: dim, borderRadius: dim / 2 },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: dim,
            height: dim,
            borderRadius: dim / 2,
          }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: c.primaryLight,
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              {
                color: c.primary,
                fontSize: fontSizeMap[size],
              },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}

      {showOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              width: onlineDotMap[size],
              height: onlineDotMap[size],
              borderRadius: onlineDotMap[size] / 2,
              borderColor: c.card,
              backgroundColor: c.success,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '600',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
});
