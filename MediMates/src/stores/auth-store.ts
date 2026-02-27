/**
 * Auth Store — Zustand store for auth state
 */

import { create } from 'zustand';
import type { UserProfile, ProEntitlement } from '@/src/types/firebase';

interface AuthState {
  // State
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboardingComplete: boolean;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  updatePro: (pro: ProEntitlement) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isOnboardingComplete: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isOnboardingComplete: user?.onboardingComplete ?? false,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  updatePro: (pro) =>
    set((state) => ({
      user: state.user ? { ...state.user, pro } : null,
    })),

  clear: () =>
    set({
      user: null,
      isAuthenticated: false,
      isOnboardingComplete: false,
      isLoading: false,
    }),
}));
