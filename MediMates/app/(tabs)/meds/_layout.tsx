/**
 * Meds tab — Stack layout
 */

import { Stack } from 'expo-router';
import { useColors } from '@/src/design-system/theme-provider';

export default function MedsLayout() {
  const c = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Medications',
          headerLargeTitle: true,
          headerLargeStyle: { backgroundColor: c.background },
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: 'Details', headerShown: false }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Medication',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
