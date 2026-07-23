/**
 * AuthGuard — Redirects to auth screens if not logged in or onboarding incomplete
 */

import { useEffect, useState } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAuth } from './use-auth';
import { hasChosenLanguage } from '@/src/i18n/preferences';

export function useAuthGuard() {
  const { isAuthenticated, isLoading, isOnboardingComplete } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  
  // Wait for navigation to be ready
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [hasLanguageChoice, setHasLanguageChoice] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      setHasLanguageChoice(true);
      return;
    }

    let cancelled = false;
    setHasLanguageChoice(null);
    hasChosenLanguage()
      .then((result) => {
        if (!cancelled) setHasLanguageChoice(result);
      })
      .catch(() => {
        if (!cancelled) setHasLanguageChoice(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, segments]);

  useEffect(() => {
    if (navigationState?.key) {
      setIsNavigationReady(true);
    }
  }, [navigationState]);

  useEffect(() => {
    // Don't navigate if loading or navigation not ready
    if (isLoading || !isNavigationReady || hasLanguageChoice === null) {
      console.log('[AuthGuard] Waiting... loading:', isLoading, 'navReady:', isNavigationReady);
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    
    console.log('[AuthGuard] Auth state:', {
      isAuthenticated,
      isOnboardingComplete,
      inAuthGroup,
      segments
    });

    const currentScreen = segments[1];

    if (!isAuthenticated) {
      if (!hasLanguageChoice && currentScreen !== 'language') {
        console.log('[AuthGuard] Redirecting to language selection');
        router.replace('/(auth)/language');
        return;
      }
      if (hasLanguageChoice && currentScreen === 'language') {
        console.log('[AuthGuard] Language selected, redirecting to onboarding');
        router.replace('/(auth)/onboarding');
        return;
      }
      if (!inAuthGroup) {
        // Not logged in → go to onboarding intro
        console.log('[AuthGuard] Redirecting to onboarding');
        router.replace('/(auth)/onboarding');
      }
    } else if (isAuthenticated && !isOnboardingComplete) {
      // Logged in but onboarding not done → go to permissions
      // (skip if already on permissions or social-opt-in to avoid loop)
      if (currentScreen !== 'permissions' && currentScreen !== 'social-opt-in') {
        console.log('[AuthGuard] Redirecting to permissions');
        router.replace('/(auth)/permissions');
      }
    } else if (isAuthenticated && isOnboardingComplete && inAuthGroup) {
      // Logged in & onboarded → go to tabs
      console.log('[AuthGuard] Redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [
    hasLanguageChoice,
    isAuthenticated,
    isLoading,
    isOnboardingComplete,
    isNavigationReady,
    segments,
    router,
  ]);
}
