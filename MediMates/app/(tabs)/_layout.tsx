/**
 * Tab Layout — 4 tabs + center FAB
 *
 * Floating pill-shaped tab bar with blur background, rounded corners,
 * detached from screen edges. Lucide icons for quality & consistency.
 * Center pink FAB button for adding meds.
 */

import { Tabs, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  House,
  Pill,
  Users,
  User,
  Plus,
} from 'lucide-react-native';

import { useAppTheme, useColors } from '@/src/design-system/theme-provider';
import { typography, spacing, radii, shadows } from '@/src/design-system/tokens';
import { useProGate } from '@/src/features/payments/use-pro-gate';

/* ── Tab icon config ── */
const TAB_ICONS: Record<string, React.ComponentType<any>> = {
  index: House,
  meds: Pill,
  inbox: Users,
  profile: User,
};

/* ── Timing config for smooth transitions ── */
const TAB_ANIM_CONFIG = {
  duration: 200,
  easing: Easing.out(Easing.cubic),
};

/* ── Individual tab button with smooth color/weight transitions ── */
function TabButton({
  routeName,
  label,
  isFocused,
  onPress,
  activeColor,
  inactiveColor,
}: {
  routeName: string;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
}) {
  const progress = useSharedValue(isFocused ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(isFocused ? 1 : 0, TAB_ANIM_CONFIG);
  }, [isFocused]);

  const IconComponent = TAB_ICONS[routeName];

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.06 }],
    opacity: 0.85 + progress.value * 0.15,
  }));

  const labelAnimStyle = useAnimatedStyle(() => ({
    opacity: 0.8 + progress.value * 0.2,
    transform: [{ scale: 0.97 + progress.value * 0.03 }],
  }));

  const dotAnimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.tabButton}
    >
      <Animated.View style={iconAnimStyle}>
        {IconComponent && (
          <IconComponent
            size={23}
            color={isFocused ? activeColor : inactiveColor}
            strokeWidth={isFocused ? 2.4 : 2}
          />
        )}
      </Animated.View>
      <Animated.Text
        style={[
          styles.tabLabel,
          { color: isFocused ? activeColor : inactiveColor },
          isFocused && styles.tabLabelActive,
          labelAnimStyle,
        ]}
      >
        {label}
      </Animated.Text>
      {/* Active indicator dot */}
      <Animated.View
        style={[
          styles.activeDot,
          { backgroundColor: activeColor },
          dotAnimStyle,
        ]}
      />
    </TouchableOpacity>
  );
}

/* ── Custom floating tab bar ── */
function CustomTabBar({ state, descriptors, navigation }: any) {
  const { isDark } = useAppTheme();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guardAddMed } = useProGate();

  // Hide tab bar when on a nested screen (e.g. chat detail)
  const focusedRoute = state.routes[state.index];
  const nestedState = focusedRoute?.state;
  const isNestedScreen = nestedState && nestedState.index !== undefined && nestedState.index > 0;
  if (isNestedScreen) return null;

  const routes = state.routes;
  const bottomPadding = Math.max(insets.bottom, 8);

  const handleTabPress = useCallback((route: any, index: number, isFocused: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      // Always navigate — even if focused, reset nested stack to root
      navigation.navigate({ name: route.name, merge: true });
    }
  }, [navigation]);

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: bottomPadding }]}>
      {/* Floating bar container */}
      <View style={styles.floatingBarWrapper}>
        <BlurView
          intensity={isDark ? 80 : 95}
          tint={isDark ? 'dark' : 'light'}
          style={styles.blurBar}
        >
          <View
            style={[
              styles.tabBarBackground,
              {
                backgroundColor: isDark
                  ? 'rgba(28, 28, 30, 0.88)'
                  : 'rgba(255, 255, 255, 0.92)',
                borderColor: isDark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(0,0,0,0.08)',
              },
            ]}
          />

          <View style={styles.tabsContainer}>
            {routes.map((route: any, index: number) => {
              const { options } = descriptors[route.key];
              if (options.href === null) return null; // skip hidden tabs
              const isFocused = state.index === index;

              return (
                <TabButton
                  key={route.key}
                  routeName={route.name}
                  label={options.title || route.name}
                  isFocused={isFocused}
                  onPress={() => handleTabPress(route, index, isFocused)}
                  activeColor={c.primary}
                  inactiveColor={c.textTertiary}
                />
              );
            })}
          </View>
        </BlurView>
      </View>

      {/* Center FAB — absolutely positioned, raised above bar */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: c.primary,
            bottom: bottomPadding + 26,
          },
        ]}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (guardAddMed()) {
            router.push('/(tabs)/meds/add');
          }
        }}
      >
        <Plus size={30} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const { isDark } = useAppTheme();
  const c = useColors();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // No animation — instant tab switch, prevents glitches
        animation: 'none',
        lazy: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
        }}
      />
      <Tabs.Screen
        name="meds"
        options={{
          title: 'Meds',
        }}
      />
      <Tabs.Screen
        name="mates"
        options={{
          title: 'Mates',
          href: null, // Hidden — matching is now in inbox
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Mates',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const TAB_BAR_MARGIN_H = 16;
const TAB_BAR_HEIGHT = 62;

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  /* Floating bar */
  floatingBarWrapper: {
    marginHorizontal: TAB_BAR_MARGIN_H,
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: TAB_BAR_MARGIN_H,
  },
  blurBar: {
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.xl,
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },

  /* Tab button */
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },

  /* Center FAB */
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xl,
  },
});
