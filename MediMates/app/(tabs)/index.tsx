/**
 * Today Screen — Main dashboard
 *
 * Shows avatar greeting header, date picker, week day selector,
 * "To take" medication list with dose cards.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useColors } from '@/src/design-system/theme-provider';
import { Avatar } from '@/src/design-system/components/avatar';
import { EmptyState } from '@/src/design-system/components/empty-state';
import { WeekDayPicker } from '@/src/features/today/components/week-day-picker';
import { DoseListCard } from '@/src/features/today/components/dose-list-card';
import { LogDoseSheet } from '@/src/features/today/components/log-dose-sheet';
import { useTodayDoses, useLogDose } from '@/src/features/today/hooks/use-today-doses';
import { useAuth } from '@/src/features/auth/use-auth';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ScheduledDose, DoseStatus } from '@/src/types/firebase';

export default function TodayScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const logDose = useLogDose();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sheetDose, setSheetDose] = useState<ScheduledDose | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { doses, totalCount, isLoading } = useTodayDoses(selectedDate);

  const handleLogDose = useCallback(
    (dose: ScheduledDose, status: DoseStatus, note: string) => {
      logDose.mutate({
        dose,
        status,
        note,
        date: selectedDate,
      });
    },
    [logDose, selectedDate],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['meds'] });
    await queryClient.invalidateQueries({ queryKey: ['dayLog'] });
    setRefreshing(false);
  }, [queryClient]);

  const firstName = user?.displayName?.split(' ')[0] ?? 'there';
  const hasDoses = totalCount > 0;
  const dateLabel = `Today, ${format(selectedDate, 'd MMMM')}`;

  const takenCount = doses.filter((d) => d.status === 'taken').length;
  const pendingDoses = doses.filter(
    (d) => d.status === 'pending' || d.status === 'snoozed',
  );
  const completedDoses = doses.filter(
    (d) => d.status === 'taken' || d.status === 'skipped',
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.sm },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header: Avatar + Name + Settings */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <Avatar
              uri={user?.photoURL}
              name={user?.displayName ?? 'User'}
              size="md"
            />
            <View style={styles.greetingText}>
              <Text style={[styles.hey, { color: c.textSecondary }]}>Hey,</Text>
              <Text style={[styles.name, { color: c.textPrimary }]}>
                {firstName} 👋
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: c.surface }]}
            activeOpacity={0.7}
          >
            <IconSymbol name="gearshape" size={20} color={c.textSecondary} />
          </TouchableOpacity>
        </MotiView>

        {/* Date label */}
        <TouchableOpacity
          style={styles.dateRow}
          activeOpacity={0.7}
        >
          <Text style={[styles.dateLabel, { color: c.textPrimary }]}>
            {dateLabel}
          </Text>
          <IconSymbol name="chevron.down" size={16} color={c.textPrimary} />
        </TouchableOpacity>

        {/* Week day picker */}
        <View style={styles.weekPicker}>
          <WeekDayPicker
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </View>

        {/* To take header */}
        {hasDoses && (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
                To take
              </Text>
              <View style={[styles.countBadge, { backgroundColor: c.primaryLight }]}>
                <Text style={[styles.countBadgeText, { color: c.primary }]}>
                  {pendingDoses.length}
                </Text>
              </View>
            </View>
            <Text style={[styles.progressText, { color: c.textTertiary }]}>
              {takenCount}/{totalCount} done
            </Text>
          </View>
        )}

        {/* Pending dose cards */}
        {pendingDoses.length > 0 && (
          <View style={styles.doseList}>
            {pendingDoses.map((dose) => (
              <DoseListCard
                key={`${dose.medId}-${dose.scheduledTime}`}
                dose={dose}
                onPress={() => setSheetDose(dose)}
              />
            ))}
          </View>
        )}

        {/* Completed section */}
        {completedDoses.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
                Completed
              </Text>
            </View>
            <View style={styles.doseList}>
              {completedDoses.map((dose) => (
                <DoseListCard
                  key={`${dose.medId}-${dose.scheduledTime}-done`}
                  dose={dose}
                  onPress={() => setSheetDose(dose)}
                />
              ))}
            </View>
          </>
        )}

        {/* Empty state */}
        {!hasDoses && (
          <EmptyState
            icon="pill.fill"
            title="No medications yet"
            subtitle="Add your first medication to start tracking and get reminders."
            actionLabel="Add Medication"
            onAction={() => {}}
          />
        )}

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Log Dose Sheet */}
      {sheetDose && (
        <LogDoseSheet
          dose={sheetDose}
          onLog={handleLogDose}
          onDismiss={() => setSheetDose(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  greetingText: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  hey: {
    ...typography.sizes.title1,
    fontWeight: '400',
  },
  name: {
    ...typography.sizes.title1,
    fontWeight: '700',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  dateLabel: {
    ...typography.sizes.headline,
  },
  weekPicker: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.sizes.title3,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    ...typography.sizes.caption1,
    fontWeight: '700',
  },
  progressText: {
    ...typography.sizes.footnote,
    fontWeight: '500',
  },
  doseList: {
    gap: 0,
  },
});
