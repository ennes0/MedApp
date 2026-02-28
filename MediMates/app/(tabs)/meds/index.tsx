/**
 * Meds list screen — displays all user medications with modern card UI.
 * Includes analytics icon (Pro) in the header.
 */

import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing } from '@/src/design-system/tokens';
import { EmptyState } from '@/src/design-system/components/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MedCard } from '@/src/features/meds/components/med-card';
import { AnalyticsModal } from '@/src/features/meds/components/analytics-modal';
import { useMeds } from '@/src/features/meds/hooks/use-meds';
import { useProGate } from '@/src/features/payments/use-pro-gate';
import type { Medication } from '@/src/types/firebase';

export default function MedsScreen() {
  const c = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: meds, isLoading } = useMeds();
  const { isPro, guardAnalytics, guardAddMed } = useProGate();
  const [analyticsVisible, setAnalyticsVisible] = useState(false);

  const handleAnalyticsPress = useCallback(() => {
    if (guardAnalytics()) {
      setAnalyticsVisible(true);
    }
  }, [guardAnalytics]);

  // Set analytics icon in native header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleAnalyticsPress}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.card,
            marginRight: 4,
          }}
          activeOpacity={0.7}
        >
          <IconSymbol name="chart.bar.fill" size={18} color={isPro ? c.primary : c.textTertiary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleAnalyticsPress, isPro, c]);

  const navigateToDetail = useCallback(
    (med: Medication) => {
      router.push({ pathname: '/(tabs)/meds/[id]', params: { id: med.id } });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Medication; index: number }) => (
      <MedCard med={item} onPress={() => navigateToDetail(item)} index={index} />
    ),
    [navigateToDetail],
  );

  const handleAddPress = () => {
    if (guardAddMed()) {
      router.push('/(tabs)/meds/add');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={meds}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="pill.fill"
              title="No medications yet"
              subtitle="Add your first medication to start tracking and get reminders."
              actionLabel="Add Medication"
              onAction={handleAddPress}
            />
          ) : null
        }
      />

      {/* Analytics Modal (Pro only) */}
      <AnalyticsModal
        visible={analyticsVisible}
        onClose={() => setAnalyticsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    flexGrow: 1,
  },
});
