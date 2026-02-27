/**
 * MediMates Design System Tokens
 *
 * iOS-first, Apple-style design tokens.
 * 8pt grid spacing, SF Pro typography, iOS-native radii & shadows.
 */

import { Easing, type WithTimingConfig, type WithSpringConfig } from 'react-native-reanimated';
import { Platform } from 'react-native';

// ──────────────────────────────────────────────
// Colors
// ──────────────────────────────────────────────

export const palette = {
  // Primary — iOS blue
  blue50: '#E5F0FF',
  blue100: '#CCE0FF',
  blue200: '#99C2FF',
  blue300: '#66A3FF',
  blue400: '#3385FF',
  blue500: '#007AFF',
  blue600: '#0062CC',
  blue700: '#004999',
  blue800: '#003166',
  blue900: '#001833',

  // Secondary — Teal
  teal50: '#E0F7F6',
  teal100: '#B2EDEA',
  teal200: '#80E2DD',
  teal300: '#4DD7D0',
  teal400: '#26CFC6',
  teal500: '#00C7BE',
  teal600: '#009F98',
  teal700: '#007772',
  teal800: '#00504C',
  teal900: '#002826',

  // Success — Green
  green50: '#E8F5E9',
  green100: '#C8E6C9',
  green200: '#A5D6A7',
  green300: '#81C784',
  green400: '#66BB6A',
  green500: '#34C759',
  green600: '#2DA44E',
  green700: '#1B7A37',
  green800: '#124D22',
  green900: '#09260F',

  // Warning — Amber
  amber50: '#FFF8E1',
  amber100: '#FFECB3',
  amber200: '#FFE082',
  amber300: '#FFD54F',
  amber400: '#FFCA28',
  amber500: '#FF9F0A',
  amber600: '#CC7F08',
  amber700: '#995F06',
  amber800: '#664004',
  amber900: '#332002',

  // Error — Red
  red50: '#FFEBEE',
  red100: '#FFCDD2',
  red200: '#EF9A9A',
  red300: '#E57373',
  red400: '#EF5350',
  red500: '#FF3B30',
  red600: '#CC2F26',
  red700: '#99231D',
  red800: '#661813',
  red900: '#330C0A',

  // Neutral
  neutral0: '#FFFFFF',
  neutral50: '#F9FAFB',
  neutral100: '#F2F2F7',
  neutral200: '#E5E5EA',
  neutral300: '#D1D1D6',
  neutral400: '#C7C7CC',
  neutral500: '#AEAEB2',
  neutral600: '#8E8E93',
  neutral700: '#636366',
  neutral800: '#48484A',
  neutral900: '#3A3A3C',
  neutral950: '#2C2C2E',
  neutral1000: '#1C1C1E',
  neutralBlack: '#000000',
} as const;

export type Palette = typeof palette;

export const colors = {
  light: {
    // Surfaces
    background: palette.neutral0,
    surface: palette.neutral50,
    card: palette.neutral0,
    elevated: palette.neutral0,

    // Borders
    border: palette.neutral200,
    borderLight: palette.neutral100,
    separator: palette.neutral200,

    // Text
    textPrimary: palette.neutralBlack,
    textSecondary: palette.neutral600,
    textTertiary: palette.neutral500,
    textInverse: palette.neutral0,

    // Interactive
    primary: palette.blue500,
    primaryLight: palette.blue50,
    secondary: palette.teal500,
    secondaryLight: palette.teal50,

    // Semantic
    success: palette.green500,
    successLight: palette.green50,
    warning: palette.amber500,
    warningLight: palette.amber50,
    error: palette.red500,
    errorLight: palette.red50,

    // Tab bar
    tabBarBackground: 'rgba(249, 250, 251, 0.92)',
    tabBarBorder: palette.neutral200,
    tabBarActive: palette.blue500,
    tabBarInactive: palette.neutral600,

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.4)',
    sheetBackdrop: 'rgba(0, 0, 0, 0.25)',
  },
  dark: {
    // Surfaces
    background: palette.neutralBlack,
    surface: palette.neutral1000,
    card: palette.neutral950,
    elevated: palette.neutral900,

    // Borders
    border: palette.neutral800,
    borderLight: palette.neutral900,
    separator: palette.neutral800,

    // Text
    textPrimary: palette.neutral0,
    textSecondary: palette.neutral500,
    textTertiary: palette.neutral600,
    textInverse: palette.neutralBlack,

    // Interactive
    primary: palette.blue400,
    primaryLight: 'rgba(0, 122, 255, 0.18)',
    secondary: palette.teal400,
    secondaryLight: 'rgba(0, 199, 190, 0.18)',

    // Semantic
    success: palette.green400,
    successLight: 'rgba(52, 199, 89, 0.18)',
    warning: palette.amber400,
    warningLight: 'rgba(255, 159, 10, 0.18)',
    error: palette.red400,
    errorLight: 'rgba(255, 59, 48, 0.18)',

    // Tab bar
    tabBarBackground: 'rgba(28, 28, 30, 0.92)',
    tabBarBorder: palette.neutral800,
    tabBarActive: palette.blue400,
    tabBarInactive: palette.neutral600,

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.6)',
    sheetBackdrop: 'rgba(0, 0, 0, 0.5)',
  },
} as const;

export type ThemeColors = typeof colors.light;
export type ColorScheme = 'light' | 'dark';

// ──────────────────────────────────────────────
// Spacing — 8pt grid
// ──────────────────────────────────────────────

export const spacing = {
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
} as const;

export type Spacing = typeof spacing;

// ──────────────────────────────────────────────
// Radii
// ──────────────────────────────────────────────

export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  button: 14,
  card: 16,
  lg: 20,
  sheet: 24,
  full: 9999,
} as const;

export type Radii = typeof radii;

// ──────────────────────────────────────────────
// Typography — SF Pro scale (iOS system fonts)
// ──────────────────────────────────────────────

const fontFamily = Platform.select({
  ios: {
    sans: 'System',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
    serif: 'ui-serif',
  },
  default: {
    sans: 'System',
    rounded: 'System',
    mono: 'monospace',
    serif: 'serif',
  },
});

export const typography = {
  fonts: fontFamily!,

  sizes: {
    largeTitle: {
      fontSize: 34,
      lineHeight: 41,
      fontWeight: '700' as const,
      letterSpacing: 0.37,
    },
    title1: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700' as const,
      letterSpacing: 0.36,
    },
    title2: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700' as const,
      letterSpacing: 0.35,
    },
    title3: {
      fontSize: 20,
      lineHeight: 25,
      fontWeight: '600' as const,
      letterSpacing: 0.38,
    },
    headline: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '600' as const,
      letterSpacing: -0.41,
    },
    body: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '400' as const,
      letterSpacing: -0.41,
    },
    callout: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '400' as const,
      letterSpacing: -0.32,
    },
    subhead: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '400' as const,
      letterSpacing: -0.24,
    },
    footnote: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '400' as const,
      letterSpacing: -0.08,
    },
    caption1: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    caption2: {
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '400' as const,
      letterSpacing: 0.07,
    },
  },

  tabularNums: {
    fontVariant: ['tabular-nums' as const],
  },
} as const;

export type TypographySize = keyof typeof typography.sizes;

// ──────────────────────────────────────────────
// Motion
// ──────────────────────────────────────────────

export const motion = {
  durations: {
    micro: 140,
    card: 220,
    sheet: 280,
    slow: 400,
  },

  easing: {
    default: Easing.out(Easing.cubic),
    enter: Easing.out(Easing.cubic),
    exit: Easing.in(Easing.cubic),
  },

  timing: {
    micro: {
      duration: 140,
      easing: Easing.out(Easing.cubic),
    } satisfies WithTimingConfig,
    card: {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    } satisfies WithTimingConfig,
    sheet: {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    } satisfies WithTimingConfig,
  },

  spring: {
    default: {
      damping: 15,
      stiffness: 150,
      mass: 1,
    } satisfies WithSpringConfig,
    snappy: {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    } satisfies WithSpringConfig,
    gentle: {
      damping: 12,
      stiffness: 100,
      mass: 1,
    } satisfies WithSpringConfig,
  },

  pressScale: 0.98,
} as const;

// ──────────────────────────────────────────────
// Shadows (iOS-only, no elevation)
// ──────────────────────────────────────────────

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
} as const;

export type Shadow = keyof typeof shadows;

// ──────────────────────────────────────────────
// Hit slop defaults
// ──────────────────────────────────────────────

export const hitSlop = {
  sm: { top: 4, right: 4, bottom: 4, left: 4 },
  md: { top: 8, right: 8, bottom: 8, left: 8 },
  lg: { top: 12, right: 12, bottom: 12, left: 12 },
} as const;

// ──────────────────────────────────────────────
// Full theme export
// ──────────────────────────────────────────────

export const tokens = {
  colors,
  palette,
  spacing,
  radii,
  typography,
  motion,
  shadows,
  hitSlop,
} as const;

export type Tokens = typeof tokens;
