/**
 * Root Layout — All providers + auth guard + navigation structure
 */

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { AppThemeProvider } from '@/src/design-system/theme-provider';
import { AuthProvider } from '@/src/features/auth/auth-provider';
import { useAuthGuard } from '@/src/features/auth/auth-guard';
import { useNotifications } from '@/src/features/notifications/use-notifications';
import { queryClient } from '@/src/lib/query-client';
import { ToastContainer } from '@/src/design-system/components/toast';
import { RevenueCatProvider } from '@/src/features/payments/revenue-cat-provider';
import { useAuthStore } from '@/src/stores/auth-store';
import { SplashScreen as CustomSplashScreen } from '@/components/SplashScreen';

// Keep splash screen visible until auth state resolves
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  
  useAuthGuard();
  useNotifications();

  const isLoading = useAuthStore((s) => s.isLoading);

  // Hide native splash as soon as auth is ready so custom animation is visible
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  const handleAnimationComplete = () => {
    setShowCustomSplash(false);
  };

  if (showCustomSplash) {
    return <CustomSplashScreen onAnimationComplete={handleAnimationComplete} />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'MedMates Pro',
          }}
        />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Modal',
          }}
        />
      </Stack>
      <ToastContainer />
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RevenueCatProvider>
            <AppThemeProvider>
              <BottomSheetModalProvider>
                <RootNavigator />
              </BottomSheetModalProvider>
            </AppThemeProvider>
          </RevenueCatProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
