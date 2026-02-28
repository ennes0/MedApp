/**
 * Tab Layout — 4 tabs + center FAB
 *
 * Custom tab bar with blur background, center pink FAB button for adding meds.
 * Matches design: pill icon, meds text, (+) FAB, history icon, clock icon
 */

import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme, useColors } from '@/src/design-system/theme-provider';
import { typography, spacing, radii, shadows } from '@/src/design-system/tokens';
import { useProGate } from '@/src/features/payments/use-pro-gate';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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

  return (
    <View style={[styles.tabBarOuter]}>
      <BlurView
        intensity={isDark ? 70 : 90}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.tabBar,
          {
            paddingBottom: insets.bottom,
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View
          style={[
            styles.tabBarBackground,
            { backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.85)' },
          ]}
        />

        <View style={styles.tabsContainer}>
          {routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TabButton
                key={route.key}
                label={options.title || route.name}
                icon={options.tabBarIcon}
                isFocused={isFocused}
                onPress={onPress}
                color={c}
              />
            );
          })}
        </View>
      </BlurView>

      {/* Center FAB — absolutely positioned */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: c.primary, bottom: insets.bottom + 20 }]}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (guardAddMed()) {
            router.push('/(tabs)/meds/add');
          }
        }}
      >
        <IconSymbol name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

function TabButton({ label, icon, isFocused, onPress, color }: any) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 1 : 0.9, { damping: 15, stiffness: 200 });
    translateY.value = withSpring(isFocused ? -2 : 0, { damping: 15, stiffness: 200 });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return (
    <AnimatedTouchable
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.tabButton, animatedStyle]}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          isFocused && {
            backgroundColor: color.primary + '15',
            borderRadius: 12,
            padding: 6,
          },
        ]}
      >
        {icon?.({ color: isFocused ? color.primary : color.textTertiary })}
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: isFocused ? color.primary : color.textTertiary,
            fontWeight: isFocused ? '600' : '500',
          },
        ]}
      >
        {label}
      </Text>
    </AnimatedTouchable>
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meds"
        options={{
          title: 'Meds',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="pill.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mates"
        options={{
          title: 'Mates',
          href: null, // Hide old discover tab — matching is now in inbox
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="heart.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Mates',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={24}
              name="person.2.fill"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={24}
              name="person.crop.circle.fill"
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  iconContainer: {
    marginBottom: 4,
  },
  tabLabel: {
    ...typography.sizes.caption2,
    fontSize: 11,
  },
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
    ...shadows.lg,
  },
});
