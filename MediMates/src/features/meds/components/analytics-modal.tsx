/**
 * Analytics Modal — Pro-only medication analytics dashboard
 *
 * Shows adherence stats, medication breakdown, and weekly trends.
 * Accessible from the Medications screen header icon.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, useAppTheme } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { useMeds } from '@/src/features/meds/hooks/use-meds';
import { useTodayDoses } from '@/src/features/today/hooks/use-today-doses';
import { useAuthStore } from '@/src/stores/auth-store';
import { generateDummyReport } from '@/src/features/meds/services/pdf-report';
import { useUIStore } from '@/src/stores/ui-store';

const { width: SCREEN_W } = Dimensions.get('window');

interface AnalyticsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AnalyticsModal({ visible, onClose }: AnalyticsModalProps) {
  const c = useColors();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data: meds = [] } = useMeds();
  const { takenCount, totalCount, adherence } = useTodayDoses();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const activeMeds = useMemo(() => meds.filter((m) => !m.paused), [meds]);
  const pausedMeds = useMemo(() => meds.filter((m) => m.paused), [meds]);
  const medsWithReminders = useMemo(
    () => activeMeds.filter((m) => m.reminderEnabled),
    [activeMeds],
  );

  const totalDailyDoses = useMemo(
    () => activeMeds.reduce((sum, m) => sum + (m.schedule.times?.length ?? 0), 0),
    [activeMeds],
  );

  const adherencePct = Math.round((adherence ?? 0) * 100);

  // Simple bar chart data (today's per-med adherence)
  const perMedData = useMemo(
    () =>
      activeMeds.map((med) => {
        const timesCount = med.schedule.times?.length ?? 0;
        // Simplified: we don't have per-med taken count from the hook,
        // use a proportional estimate
        const estTaken = totalCount > 0
          ? Math.round((takenCount / totalCount) * timesCount)
          : 0;
        const pct = timesCount > 0 ? Math.round((estTaken / timesCount) * 100) : 0;
        return { name: med.name, color: med.color ?? '#007AFF', pct, timesCount };
      }),
    [activeMeds, takenCount, totalCount],
  );

  const handleExportPDF = async () => {
    try {
      await generateDummyReport(
        meds,
        user?.displayName ?? 'MediMates User',
      );
      showToast({ type: 'success', title: 'Report generated!' });
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to generate report' });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: c.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
          <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
            Analytics
          </Text>
          <View style={styles.headerRight}>
            <PressableScale onPress={handleExportPDF} style={[styles.exportBtn, { backgroundColor: c.primary }]}>
              <IconSymbol name="square.and.arrow.up" size={14} color="#FFFFFF" />
              <Text style={styles.exportBtnText}>Export PDF</Text>
            </PressableScale>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: c.surface }]}>
              <IconSymbol name="xmark" size={16} color={c.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Stats */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.statValue, { color: '#1565C0' }]}>
                {activeMeds.length}
              </Text>
              <Text style={[styles.statLabel, { color: '#64B5F6' }]}>Active Meds</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.statValue, { color: '#2E7D32' }]}>
                {adherencePct}%
              </Text>
              <Text style={[styles.statLabel, { color: '#81C784' }]}>Today</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[styles.statValue, { color: '#E65100' }]}>
                {totalDailyDoses}
              </Text>
              <Text style={[styles.statLabel, { color: '#FFB74D' }]}>Daily Doses</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
              <Text style={[styles.statValue, { color: '#6A1B9A' }]}>
                {medsWithReminders.length}
              </Text>
              <Text style={[styles.statLabel, { color: '#BA68C8' }]}>Reminders</Text>
            </View>
          </View>

          {/* Today's Progress */}
          <View style={[styles.section, { backgroundColor: c.card, ...shadows.sm }]}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
              Today's Progress
            </Text>
            <View style={styles.progressRow}>
              <View style={[styles.progressTrack, { backgroundColor: c.surface }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${adherencePct}%`,
                      backgroundColor: adherencePct >= 80 ? '#34C759' : adherencePct >= 50 ? '#FF9500' : '#FF3B30',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: c.textSecondary }]}>
                {takenCount}/{totalCount} doses
              </Text>
            </View>
          </View>

          {/* Per-Medication Breakdown */}
          <View style={[styles.section, { backgroundColor: c.card, ...shadows.sm }]}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
              Medication Breakdown
            </Text>
            {perMedData.length > 0 ? (
              perMedData.map((med, i) => (
                <View key={i} style={styles.medRow}>
                  <View style={styles.medRowLeft}>
                    <View style={[styles.medDot, { backgroundColor: med.color }]} />
                    <Text
                      style={[styles.medRowName, { color: c.textPrimary }]}
                      numberOfLines={1}
                    >
                      {med.name}
                    </Text>
                  </View>
                  <View style={styles.medRowRight}>
                    <View style={[styles.miniBar, { backgroundColor: c.surface }]}>
                      <View
                        style={[
                          styles.miniBarFill,
                          {
                            width: `${Math.min(med.pct, 100)}%`,
                            backgroundColor: med.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.medRowPct, { color: c.textSecondary }]}>
                      {med.timesCount}x/day
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>
                No active medications
              </Text>
            )}
          </View>

          {/* Quick Stats */}
          <View style={[styles.section, { backgroundColor: c.card, ...shadows.sm }]}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
              Summary
            </Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>
                Total Medications
              </Text>
              <Text style={[styles.summaryValue, { color: c.textPrimary }]}>
                {meds.length}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: c.separator }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>
                Active
              </Text>
              <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                {activeMeds.length}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: c.separator }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>
                Paused
              </Text>
              <Text style={[styles.summaryValue, { color: '#FF9500' }]}>
                {pausedMeds.length}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: c.separator }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>
                With Reminders
              </Text>
              <Text style={[styles.summaryValue, { color: '#007AFF' }]}>
                {medsWithReminders.length}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.sizes.title2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: (SCREEN_W - spacing.md * 2 - spacing.sm) / 2 - 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    ...typography.sizes.caption1,
    fontWeight: '500',
    marginTop: 2,
  },

  /* Section */
  section: {
    borderRadius: radii.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.sizes.headline,
    marginBottom: spacing.md,
  },

  /* Progress */
  progressRow: {
    gap: spacing.sm,
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    ...typography.sizes.caption1,
    marginTop: 4,
  },

  /* Med Rows */
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  medRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.md,
  },
  medDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  medRowName: {
    ...typography.sizes.body,
    fontWeight: '500',
    flex: 1,
  },
  medRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: 140,
  },
  miniBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  medRowPct: {
    ...typography.sizes.caption1,
    fontWeight: '600',
    width: 44,
    textAlign: 'right',
  },

  /* Summary */
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    ...typography.sizes.body,
  },
  summaryValue: {
    ...typography.sizes.headline,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },

  emptyText: {
    ...typography.sizes.body,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
