/**
 * Meds list screen — displays all user medications with modern UI.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { EmptyState } from '@/src/design-system/components/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MedCard } from '@/src/features/meds/components/med-card';
import { useMeds } from '@/src/features/meds/hooks/use-meds';
import type { Medication } from '@/src/types/firebase';

export default function MedsScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: meds, isLoading } = useMeds();

  const activeMeds = meds?.filter((m) => !m.paused) ?? [];
  const pausedMeds = meds?.filter((m) => m.paused) ?? [];

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

  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        {(meds?.length ?? 0) > 0 && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: c.primaryLight }]}>
              <View style={[styles.statIconCircle, { backgroundColor: c.primary + '20' }]}>
                <IconSymbol name="checkmark.circle.fill" size={18} color={c.primary} />
              </View>
              <Text style={[styles.statNumber, { color: c.primary }]}>
                {activeMeds.length}
              </Text>
              <Text style={[styles.statLabel, { color: c.primary }]}>
                Active
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: c.warningLight }]}>
              <View style={[styles.statIconCircle, { backgroundColor: c.warning + '20' }]}>
                <IconSymbol name="pause.circle.fill" size={18} color={c.warning} />
              </View>
              <Text style={[styles.statNumber, { color: c.warning }]}>
                {pausedMeds.length}
              </Text>
              <Text style={[styles.statLabel, { color: c.warning }]}>
                Paused
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: c.successLight }]}>
              <View style={[styles.statIconCircle, { backgroundColor: c.success + '20' }]}>
                <IconSymbol name="pill.fill" size={18} color={c.success} />
              </View>
              <Text style={[styles.statNumber, { color: c.success }]}>
                {meds?.length ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: c.success }]}>
                Total
              </Text>
            </View>
          </View>
        )}
      </View>
    ),
    [meds, activeMeds.length, pausedMeds.length, c],
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={meds}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 120 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="pill.fill"
              title="No medications yet"
              subtitle="Add your first medication to start tracking and get reminders."
              actionLabel="Add Medication"
              onAction={() => router.push('/(tabs)/meds/add')}
            />
          ) : null
        }
      />

      {/* Floating Action Button */}
      {(meds?.length ?? 0) > 0 && (
        <View style={[styles.fabWrapper, { bottom: insets.bottom + 80 }]}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: c.primary }]}
            onPress={() => router.push('/(tabs)/meds/add')}
            activeOpacity={0.85}
          >
            <IconSymbol name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.fabText}>Add Med</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: spacing.md,
    flexGrow: 1,
  },
  listHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statNumber: {
    ...typography.sizes.title2,
    fontWeight: '800',
  },
  statLabel: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },
  fabWrapper: {
    position: 'absolute',
    alignSelf: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 28,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    ...shadows.lg,
  },
  fabText: {
    color: '#FFFFFF',
    ...typography.sizes.headline,
  },
});
