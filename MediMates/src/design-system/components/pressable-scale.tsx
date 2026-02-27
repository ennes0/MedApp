/**
 * PressableScale — Simple pressable with opacity feedback + haptic
 *
 * Usage:
 *   <PressableScale onPress={…}>
 *     <Text>Tap me</Text>
 *   </PressableScale>
 */

import React from 'react';
import { TouchableOpacity, type ViewStyle, type StyleProp } from 'react-native';
import * as Haptics from 'expo-haptics';

interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  haptic?: boolean;
  scale?: number; // Not used with TouchableOpacity, kept for API compatibility
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  testID?: string;
}

export function PressableScale({
  onPress,
  onLongPress,
  disabled = false,
  haptic = true,
  style,
  children,
  testID,
}: PressableScaleProps) {
  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const handleLongPress = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onLongPress?.();
  };

  return (
    <TouchableOpacity
      testID={testID}
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}
