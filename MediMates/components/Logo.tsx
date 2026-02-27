/**
 * Logo Component - For headers and navigation
 * Uses the full logo with text (2.png)
 */

import { Image, StyleSheet, ImageStyle } from 'react-native';

interface LogoProps {
  height?: number;
  style?: ImageStyle;
}

export function Logo({ height = 32, style }: LogoProps) {
  return (
    <Image
      source={require('../assets/images/2.png')}
      style={[styles.logo, { height }, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 'auto',
    aspectRatio: 3, // Adjust based on actual logo dimensions
  },
});
