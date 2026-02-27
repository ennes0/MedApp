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
        options={{ title: 'Profile', headerLargeTitle: true }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          title: 'MediMates Pro',
          presentation: 'modal',
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
