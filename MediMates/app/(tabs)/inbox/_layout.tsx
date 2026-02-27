/**
 * Mates tab — Stack layout (matching + chat)
 */

import { Stack } from 'expo-router';
import { useColors } from '@/src/design-system/theme-provider';

export default function MatesLayout() {
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
        options={{ title: 'Mates', headerLargeTitle: true }}
      />
      <Stack.Screen
        name="[chatId]"
        options={{
          headerBackTitle: 'Back',
          headerTitleAlign: 'left',
        }}
      />
    </Stack>
  );
}
