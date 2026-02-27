/**
 * MediMates Theme Provider
 *
 * Merges react-navigation theme with design system tokens.
 * Provides `useAppTheme()` hook for full typed access to colors + tokens.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  type Theme as NavigationTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { colors, tokens, type ColorScheme, type ThemeColors } from './tokens';

// ──────────────────────────────────────────────
// Theme shape
// ──────────────────────────────────────────────

export interface AppTheme {
  scheme: ColorScheme;
  colors: ThemeColors;
  tokens: typeof tokens;
  isDark: boolean;
}

const AppThemeContext = createContext<AppTheme | null>(null);

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export function useAppTheme(): AppTheme {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within <AppThemeProvider>');
  }
  return ctx;
}

/** Shortcut: just the resolved colors for current scheme */
export function useColors(): ThemeColors {
  return useAppTheme().colors;
}

// ──────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────

interface AppThemeProviderProps {
  children: React.ReactNode;
}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = systemScheme === 'dark' ? 'dark' : 'light';
  const isDark = scheme === 'dark';

  const resolvedColors = colors[scheme];

  // Merge with react-navigation theme
  const navigationTheme: NavigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme : DefaultTheme).colors,
        primary: resolvedColors.primary,
        background: resolvedColors.background,
        card: resolvedColors.card,
        text: resolvedColors.textPrimary,
        border: resolvedColors.border,
        notification: resolvedColors.error,
      },
    }),
    [isDark, resolvedColors],
  );

  const appTheme: AppTheme = useMemo(
    () => ({
      scheme,
      colors: resolvedColors,
      tokens,
      isDark,
    }),
    [scheme, resolvedColors, isDark],
  );

  return (
    <AppThemeContext.Provider value={appTheme}>
      <NavigationThemeProvider value={navigationTheme}>
        {children}
      </NavigationThemeProvider>
    </AppThemeContext.Provider>
  );
}
