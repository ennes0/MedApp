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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/src/design-system/theme-provider';
import { Avatar } from '@/src/design-system/components/avatar';
import { EmptyState } from '@/src/design-system/components/empty-state';
import { WeekDayPicker } from '@/src/features/today/components/week-day-picker';
import { DoseListCard } from '@/src/features/today/components/dose-list-card';
import { LogDoseSheet } from '@/src/features/today/components/log-dose-sheet';
import { AppleHealthCard } from '@/src/features/today/components/apple-health-card';
import { useTodayDoses, useLogDose } from '@/src/features/today/hooks/use-today-doses';
import { useAppleHealth } from '@/src/features/health/use-apple-health';
import { useAuth } from '@/src/features/auth/use-auth';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ScheduledDose, DoseStatus } from '@/src/types/firebase';

function getDateString(date: Date, tz: string): string {
  return format(toZonedTime(date, tz), 'yyyy-MM-dd');
}

export default function TodayScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const logDose = useLogDose();
  const queryClient = useQueryClient();
  const {
    isConnected,
    todaySummary,
    refresh: refreshAppleHealth,
  } = useAppleHealth();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sheetDose, setSheetDose] = useState<ScheduledDose | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { doses, totalCount, isLoading } = useTodayDoses(selectedDate);
  const tz = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isSelectedDateToday = getDateString(selectedDate, tz) === getDateString(new Date(), tz);

  const handleLogDose = useCallback(
    (dose: ScheduledDose, status: DoseStatus, note: string) => {
      if (!isSelectedDateToday) {
        return;
      }

      logDose.mutate({
        dose,
        status,
        note,
        date: selectedDate,
      });
    },
    [isSelectedDateToday, logDose, selectedDate],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['meds'] }),
      queryClient.invalidateQueries({ queryKey: ['dayLog'] }),
      refreshAppleHealth(),
    ]);
    setRefreshing(false);
  }, [queryClient, refreshAppleHealth]);

  const firstName = user?.displayName?.split(' ')[0] ?? t('today.fallbackName');
  const hasDoses = totalCount > 0;
  const dateLabel = `${t('today.todayLabel')}, ${format(selectedDate, 'd MMMM')}`;

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
        {/* Header: Avatar + Name */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar
              uri={user?.photoURL}
              name={user?.displayName ?? 'User'}
              size="md"
            />
            <View style={styles.greetingText}>
              <Text style={[styles.hey, { color: c.textSecondary }]}>{t('today.greeting')}</Text>
              <Text style={[styles.name, { color: c.textPrimary }]}>
                {firstName} 👋
              </Text>
            </View>
          </View>
        </View>

        {/* Date label — larger */}
        <View style={styles.dateRow}>
          <Text style={[styles.dateLabel, { color: c.textPrimary }]}>
            {dateLabel}
          </Text>
        </View>

        {/* Week day picker */}
        <View style={styles.weekPicker}>
          <WeekDayPicker
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </View>

        {isConnected && todaySummary && (
          <AppleHealthCard
            steps={todaySummary.steps}
            activeCalories={todaySummary.activeCalories}
            sleepHours={todaySummary.sleepHours}
          />
        )}

        {!isSelectedDateToday && (
          <View style={[styles.readOnlyNotice, { backgroundColor: c.primaryLight }]}> 
            <IconSymbol name="lock.fill" size={18} color={c.primary} />
            <Text style={[styles.readOnlyNoticeText, { color: c.primary }]}> 
              {t('today.readOnly')}
            </Text>
          </View>
        )}

        {/* To take header */}
        {hasDoses && (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
                {t('today.toTake')}
              </Text>
              <View style={[styles.countBadge, { backgroundColor: c.primaryLight }]}>
                <Text style={[styles.countBadgeText, { color: c.primary }]}>
                  {pendingDoses.length}
                </Text>
              </View>
            </View>
            <Text style={[styles.progressText, { color: c.textTertiary }]}>
              {takenCount}/{totalCount} {t('today.done')}
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
                {t('today.completed')}
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
            title={t('today.emptyTitle')}
            subtitle={t('today.emptySubtitle')}
            actionLabel={t('today.addMedication')}
            onAction={() => router.push('/(tabs)/meds/add')}
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
          canEdit={isSelectedDateToday}
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  dateLabel: {
    ...typography.sizes.title2,
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
  readOnlyNotice: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.card,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  readOnlyNoticeText: {
    ...typography.sizes.footnote,
    flex: 1,
    fontWeight: '600',
  },
});
