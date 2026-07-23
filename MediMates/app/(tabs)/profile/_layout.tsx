/**
 * Profile tab — Stack layout
 */

import { Stack } from 'expo-router';
import { useColors } from '@/src/design-system/theme-provider';

export default function ProfileLayout() {
  const c = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerLargeStyle: { backgroundColor: c.background },
        headerTintColor: c.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        // The profile screen owns its title so the hero background can extend
        // behind the status bar without a separate black navigation header.
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          title: 'MedMates Pro',
          presentation: 'modal',
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
