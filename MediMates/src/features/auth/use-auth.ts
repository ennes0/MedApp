/**
 * useAuth — Convenience hook for auth state + actions
 */

import { useAuthStore } from '@/src/stores/auth-store';
import {
  signInWithApple,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  signOut,
  updateUserProfile,
} from './auth-provider';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isOnboardingComplete = useAuthStore((s) => s.isOnboardingComplete);
  const isPro = useAuthStore((s) => s.user?.pro.active ?? false);

  return {
    user,
    isAuthenticated,
    isLoading,
    isOnboardingComplete,
    isPro,
    signInWithApple,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    updateProfile: (updates: Parameters<typeof updateUserProfile>[1]) => {
      if (user) return updateUserProfile(user.uid, updates);
    },
  };
}
