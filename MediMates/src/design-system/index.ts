/**
 * Design System barrel export
 */

// Tokens
export {
  palette,
  colors,
  spacing,
  radii,
  typography,
  motion,
  shadows,
  hitSlop,
  tokens,
} from './tokens';
export type {
  Palette,
  ThemeColors,
  ColorScheme,
  Spacing,
  Radii,
  TypographySize,
  Shadow,
  Tokens,
} from './tokens';

// Theme
export { AppThemeProvider, useAppTheme, useColors } from './theme-provider';
export type { AppTheme } from './theme-provider';

// Components — re-exported for convenience
export { PressableScale } from './components/pressable-scale';
export { Button } from './components/button';
export { Card } from './components/card';
export { AppTextInput } from './components/text-input';
export { AppBottomSheet } from './components/bottom-sheet';
export { Toast, ToastContainer } from './components/toast';
export { DynamicIslandContainer } from './components/dynamic-island-notification';
export { Avatar } from './components/avatar';
export { Chip } from './components/chip';
export { ProgressRing } from './components/progress-ring';
export { EmptyState } from './components/empty-state';
export { ListItem } from './components/list-item';
export { ProLock } from './components/pro-lock';
export { SectionHeader } from './components/section-header';
