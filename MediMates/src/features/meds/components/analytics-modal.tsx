/**
 * Analytics Modal — Pro-only medication analytics dashboard (Enhanced)
 *
 * Shows detailed adherence stats, streaks, per-medication breakdown,
 * time-of-day patterns, daily trend charts, and status distribution.
 * Accessible from the Medications screen header icon.
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
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
import {
  useDoseLogs,
  type AnalyticsPeriod,
  type MedAnalytics,
} from '@/src/features/meds/hooks/use-dose-logs';
import { useAuthStore } from '@/src/stores/auth-store';
import { generateMedReport } from '@/src/features/meds/services/pdf-report';
import { useUIStore } from '@/src/stores/ui-store';
import { formatTime, pluralize } from '@/src/lib/utils';
import { AppBottomSheet } from '@/src/design-system/components/bottom-sheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { ICON_FOR_FORM } from '@/src/features/meds/types';
import type { MedicationForm } from '@/src/types/firebase';
import { useAppleHealth } from '@/src/features/health/use-apple-health';

const { width: SCREEN_W } = Dimensions.get('window');

interface AnalyticsModalProps {
  visible: boolean;
  onClose: () => void;
}

/* ── Period chip ── */
const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: '7 Days', value: 7 },
  { label: '14 Days', value: 14 },
  { label: '30 Days', value: 30 },
];

export function AnalyticsModal({ visible, onClose }: AnalyticsModalProps) {
  const c = useColors();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data: meds = [] } = useMeds();
  const { takenCount: todayTaken, totalCount: todayTotal } = useTodayDoses();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const { todaySummary } = useAppleHealth();

  const [period, setPeriod] = useState<AnalyticsPeriod>(7);
  const [expandedMed, setExpandedMed] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const exportSheetRef = useRef<BottomSheet>(null);

  const { analytics, doseLogs, isLoading } = useDoseLogs(period);

  const activeMeds = useMemo(() => meds.filter((m) => !m.paused), [meds]);
  const pausedMeds = useMemo(() => meds.filter((m) => m.paused), [meds]);
  const medsWithReminders = useMemo(
    () => activeMeds.filter((m) => m.reminderEnabled),
    [activeMeds],
  );

  const todayAdherencePct = todayTotal > 0 ? Math.round((todayTaken / todayTotal) * 100) : 0;

  const handleExportPDF = async (medId: string) => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      await generateMedReport({
        medications: meds,
        doseLogs,
        userName: user?.displayName ?? 'MediMates User',
        userEmail: user?.email ?? null,
        userTimezone: user?.timezone,
        dateGenerated: new Date(),
        period,
        analytics,
        selectedMedicationId: medId,
        appleHealthSummary: todaySummary,
      });
      showToast({ type: 'success', title: 'Report generated!' });
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to generate report' });
    } finally {
      setIsExporting(false);
    }
  };

  const openExportPicker = useCallback(() => {
    if (!activeMeds.length) {
      showToast({ type: 'info', title: 'No active medications to export' });
      return;
    }
    exportSheetRef.current?.snapToIndex(0);
  }, [activeMeds.length, showToast]);

  const onSelectMedicationForExport = useCallback(
    async (medId: string) => {
      exportSheetRef.current?.close();
      await handleExportPDF(medId);
    },
      [handleExportPDF],
  );

  const toggleMedExpand = useCallback((medId: string) => {
    setExpandedMed((prev) => (prev === medId ? null : medId));
  }, []);

  // Adherence color helper
  const adherenceColor = (pct: number) =>
    pct >= 80 ? '#34C759' : pct >= 50 ? '#FF9500' : '#FF3B30';

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
            <PressableScale
              onPress={openExportPicker}
                 disabled={isExporting}
              style={[styles.exportBtn, { backgroundColor: c.primary }]}
            >
              <IconSymbol name="doc.text.fill" size={14} color="#FFFFFF" />
              <Text style={styles.exportBtnText}>Medication PDF</Text>
            </PressableScale>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: c.surface }]}
            >
              <IconSymbol name="xmark" size={16} color={c.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Period Selector */}
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.periodChip,
                  {
                    backgroundColor:
                      period === p.value ? c.primary : c.surface,
                  },
                ]}
                onPress={() => setPeriod(p.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodChipText,
                    { color: period === p.value ? '#FFFFFF' : c.textSecondary },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hero Adherence Card */}
          <View style={[styles.heroCard, { backgroundColor: c.card, ...shadows.md }]}>
            <View style={styles.heroTop}>
              <View>
                <Text style={[styles.heroLabel, { color: c.textSecondary }]}>
                  {period}-Day Adherence
                </Text>
                <Text
                  style={[
                    styles.heroValue,
                    { color: adherenceColor(analytics.overallAdherencePct) },
                  ]}
                >
                  {analytics.overallAdherencePct}%
                </Text>
              </View>
              <View
                style={[
                  styles.heroBadge,
                  { backgroundColor: `${adherenceColor(analytics.overallAdherencePct)}18` },
                ]}
              >
                <IconSymbol
                  name={
                    analytics.overallAdherencePct >= 80
                      ? 'checkmark.seal.fill'
                      : analytics.overallAdherencePct >= 50
                        ? 'exclamationmark.triangle.fill'
                        : 'xmark.circle.fill'
                  }
                  size={32}
                  color={adherenceColor(analytics.overallAdherencePct)}
                />
              </View>
            </View>

            {/* Progress bar */}
            <View style={[styles.heroProgressTrack, { backgroundColor: c.surface }]}>
              <View
                style={[
                  styles.heroProgressFill,
                  {
                    width: `${analytics.overallAdherencePct}%`,
                    backgroundColor: adherenceColor(analytics.overallAdherencePct),
                  },
                ]}
              />
            </View>

            <Text style={[styles.heroSubtext, { color: c.textTertiary }]}>
              {analytics.totalTaken} of {analytics.totalScheduled} doses taken
            </Text>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.statValue, { color: '#1565C0' }]}>
                {activeMeds.length}
              </Text>
              <Text style={[styles.statLabel, { color: '#64B5F6' }]}>Active Meds</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.statValue, { color: '#2E7D32' }]}>
                {todayAdherencePct}%
              </Text>
              <Text style={[styles.statLabel, { color: '#81C784' }]}>Today</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[styles.statValue, { color: '#E65100' }]}>
                🔥 {analytics.currentPerfectStreak}
              </Text>
              <Text style={[styles.statLabel, { color: '#FFB74D' }]}>Day Streak</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
              <Text style={[styles.statValue, { color: '#6A1B9A' }]}>
                ⭐ {analytics.bestPerfectStreak}
              </Text>
              <Text style={[styles.statLabel, { color: '#BA68C8' }]}>Best Streak</Text>
            </View>
          </View>

          {/* Daily Trend Chart */}
          <View style={[styles.section, { backgroundColor: c.card, ...shadows.sm }]}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
              Daily Trend
            </Text>
            <View style={styles.trendChart}>
              {analytics.dailyTrend.map((day, i) => {
                const barH = Math.max((day.pct / 100) * 100, 4);
                const barColor = adherenceColor(day.pct);
                return (
                  <View key={day.date} style={styles.trendBarCol}>
                    <Text style={[styles.trendPctLabel, { color: c.textTertiary }]}>
                      {day.pct}%
                    </Text>
                    <View style={[styles.trendBarTrack, { backgroundColor: c.surface }]}>
                      <View
                        style={[
                          styles.trendBarFill,
                          {
                            height: barH,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.trendDayLabel, { color: c.textTertiary }]}>
                      {day.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Status Distribution */}
          <View style={[styles.section, { backgroundColor: c.card, ...shadows.sm }]}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
              Status Distribution
            </Text>
            {analytics.totalScheduled > 0 ? (
              <>
                {/* Visual bar */}
                <View style={styles.distBar}>
                  {analytics.statusDistribution.taken > 0 && (
                    <View
                      style={[
                        styles.distSegment,
                        {
                          flex: analytics.statusDistribution.taken,
                          backgroundColor: '#34C759',
                          borderTopLeftRadius: 6,
                          borderBottomLeftRadius: 6,
                        },
                      ]}
                    />
                  )}
                  {analytics.statusDistribution.skipped > 0 && (
                    <View
                      style={[
                        styles.distSegment,
                        {
                          flex: analytics.statusDistribution.skipped,
                          backgroundColor: '#FF9500',
                        },
                      ]}
                    />
                  )}
                  {analytics.statusDistribution.missed > 0 && (
                    <View
                      style={[
                        styles.distSegment,
                        {
                          flex: analytics.statusDistribution.missed,
                          backgroundColor: '#FF3B30',
                          borderTopRightRadius: 6,
                          borderBottomRightRadius: 6,
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Legend */}
                <View style={styles.distLegend}>
                  <View style={styles.distLegendItem}>
                    <View style={[styles.distDot, { backgroundColor: '#34C759' }]} />
                    <Text style={[styles.distLegendText, { color: c.textSecondary }]}>
                      Taken · {analytics.statusDistribution.taken}
                    </Text>
                  </View>
                  <View style={styles.distLegendItem}>
                    <View style={[styles.distDot, { backgroundColor: '#FF9500' }]} />
                    <Text style={[styles.distLegendText, { color: c.textSecondary }]}>
                      Skipped · {analytics.statusDistribution.skipped}
                    </Text>
                  </View>
                  <View style={styles.distLegendItem}>
                    <View style={[styles.distDot, { backgroundColor: '#FF3B30' }]} />
                    <Text style={[styles.distLegendText, { color: c.textSecondary }]}>
                      Missed · {analytics.statusDistribution.missed}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>
                No data yet
              </Text>
            )}
          </View>

          {/* Time of Day Pattern */}
          <View style={[styles.section, { backgroundColor: c.card, ...shadows.sm }]}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
              Time of Day
            </Text>
            <View style={styles.todGrid}>
              {([
                { key: 'morning', icon: '🌅', label: 'Morning', sub: '5am – 12pm' },
                { key: 'afternoon', icon: '☀️', label: 'Afternoon', sub: '12pm – 5pm' },
                { key: 'evening', icon: '🌇', label: 'Evening', sub: '5pm – 12am' },
                { key: 'night', icon: '🌙', label: 'Night', sub: '12am – 5am' },
              ] as const).map((slot) => {
                const data = analytics.timeOfDayPattern[slot.key];
                return (
                  <View key={slot.key} style={[styles.todCard, { backgroundColor: c.surface }]}>
                    <Text style={styles.todIcon}>{slot.icon}</Text>
                    <Text style={[styles.todLabel, { color: c.textPrimary }]}>
                      {slot.label}
                    </Text>
                    <Text
                      style={[
                        styles.todPct,
                        { color: data.total > 0 ? adherenceColor(data.pct) : c.textTertiary },
                      ]}
                    >
                      {data.total > 0 ? `${data.pct}%` : '—'}
                    </Text>
                    <Text style={[styles.todSub, { color: c.textTertiary }]}>
                      {data.total > 0 ? `${data.taken}/${data.total}` : slot.sub}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Per-Medication Breakdown */}
          <View style={[styles.section, { backgroundColor: c.card, ...shadows.sm }]}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
              Medication Details
            </Text>
            {analytics.perMed.length > 0 ? (
              analytics.perMed.map((ma) => (
                <MedAnalyticsCard
                  key={ma.medId}
                  data={ma}
                  expanded={expandedMed === ma.medId}
                  onToggle={() => toggleMedExpand(ma.medId)}
                  period={period}
                  colors={c}
                />
              ))
            ) : (
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>
                No active medications
              </Text>
            )}
          </View>

          {/* Summary Table */}
          <View style={[styles.section, { backgroundColor: c.card, ...shadows.sm }]}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
              Summary
            </Text>
            <SummaryRow label="Total Medications" value={`${meds.length}`} colors={c} />
            <Divider color={c.separator} />
            <SummaryRow label="Active" value={`${activeMeds.length}`} valueColor="#34C759" colors={c} />
            <Divider color={c.separator} />
            <SummaryRow label="Paused" value={`${pausedMeds.length}`} valueColor="#FF9500" colors={c} />
            <Divider color={c.separator} />
            <SummaryRow label="With Reminders" value={`${medsWithReminders.length}`} valueColor="#007AFF" colors={c} />
            <Divider color={c.separator} />
            <SummaryRow
              label={`${period}-Day Adherence`}
              value={`${analytics.overallAdherencePct}%`}
              valueColor={adherenceColor(analytics.overallAdherencePct)}
              colors={c}
            />
            <Divider color={c.separator} />
            <SummaryRow
              label="Total Doses Taken"
              value={`${analytics.totalTaken} / ${analytics.totalScheduled}`}
              colors={c}
            />
            <Divider color={c.separator} />
            <SummaryRow
              label="Current Perfect Streak"
              value={`${analytics.currentPerfectStreak} ${pluralize(analytics.currentPerfectStreak, 'day')}`}
              valueColor="#FF9500"
              colors={c}
            />
            <Divider color={c.separator} />
            <SummaryRow
              label="Best Perfect Streak"
              value={`${analytics.bestPerfectStreak} ${pluralize(analytics.bestPerfectStreak, 'day')}`}
              valueColor="#FF9500"
              colors={c}
            />
          </View>
        </ScrollView>
      </View>

      <AppBottomSheet
        ref={exportSheetRef}
        snapPoints={['46%']}
      >
        <View style={styles.sheetHeader}>
          <View style={[styles.sheetHeaderIconWrap, { backgroundColor: `${c.primary}15` }]}> 
            <IconSymbol name="cross.case.fill" size={18} color={c.primary} />
          </View>
          <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>Select Medication</Text>
          <Text style={[styles.sheetSubtitle, { color: c.textTertiary }]}>Generate a 3-page report for one medication</Text>
        </View>

        <View style={styles.medPickerList}>
          {activeMeds.map((med) => {
            const medIcon = med.form
              ? ICON_FOR_FORM[med.form as MedicationForm] ?? 'pill.fill'
              : 'pill.fill';

            return (
              <TouchableOpacity
                key={med.id}
                style={[styles.medPickerItem, { backgroundColor: c.surface }]}
                activeOpacity={0.75}
                onPress={() => {
                  void onSelectMedicationForExport(med.id);
                }}
                disabled={isExporting}
              >
                <View style={styles.medPickerLeft}>
                  <View style={[styles.medPickerIconWrap, { backgroundColor: `${med.color ?? c.primary}20` }]}> 
                    <IconSymbol name={medIcon as any} size={16} color={med.color ?? c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.medPickerName, { color: c.textPrimary }]} numberOfLines={1}>
                      {med.name}
                    </Text>
                    <Text style={[styles.medPickerMeta, { color: c.textTertiary }]} numberOfLines={1}>
                      {med.schedule.times.length} times/day
                    </Text>
                  </View>
                </View>
                <View style={styles.medPickerRight}>
                  <IconSymbol
                    name={isExporting ? 'hourglass' : 'chevron.right'}
                    size={14}
                    color={c.textTertiary}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </AppBottomSheet>
    </Modal>
  );
}

/* ── Per-Medication Card ── */

function MedAnalyticsCard({
  data,
  expanded,
  onToggle,
  period,
  colors: c,
}: {
  data: MedAnalytics;
  expanded: boolean;
  onToggle: () => void;
  period: AnalyticsPeriod;
  colors: ReturnType<typeof useColors>;
}) {
  const adherenceColor = (pct: number) =>
    pct >= 80 ? '#34C759' : pct >= 50 ? '#FF9500' : '#FF3B30';

  const pctColor = adherenceColor(data.adherencePct);

  // Sorted time slots for the expanded detail
  const timeSlots = useMemo(() => {
    return Object.entries(data.timeSlotStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, stats]) => ({
        time,
        ...stats,
        pct: stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0,
      }));
  }, [data.timeSlotStats]);

  return (
    <View style={[medStyles.card, { borderLeftColor: data.medColor }]}>
      <TouchableOpacity
        style={medStyles.cardHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={medStyles.cardLeft}>
          <View style={[medStyles.dot, { backgroundColor: data.medColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={[medStyles.medName, { color: c.textPrimary }]} numberOfLines={1}>
              {data.medName}
            </Text>
            <Text style={[medStyles.medSub, { color: c.textTertiary }]}>
              {data.takenCount}/{data.totalScheduled} doses · 🔥 {data.currentStreak}d streak
            </Text>
          </View>
        </View>
        <View style={medStyles.cardRight}>
          <Text style={[medStyles.pctBig, { color: pctColor }]}>
            {data.adherencePct}%
          </Text>
          <IconSymbol
            name={expanded ? 'chevron.up' : 'chevron.down'}
            size={14}
            color={c.textTertiary}
          />
        </View>
      </TouchableOpacity>

      {/* Compact bar */}
      <View style={[medStyles.compactBar, { backgroundColor: c.surface }]}>
        <View
          style={[
            medStyles.compactBarFill,
            {
              width: `${Math.min(data.adherencePct, 100)}%`,
              backgroundColor: data.medColor,
            },
          ]}
        />
      </View>

      {/* Expanded details */}
      {expanded && (
        <View style={medStyles.expandedArea}>
          {/* Mini stats row */}
          <View style={medStyles.miniStatsRow}>
            <View style={[medStyles.miniStat, { backgroundColor: '#E8F5E915' }]}>
              <Text style={[medStyles.miniStatVal, { color: '#34C759' }]}>
                {data.takenCount}
              </Text>
              <Text style={[medStyles.miniStatLabel, { color: c.textTertiary }]}>Taken</Text>
            </View>
            <View style={[medStyles.miniStat, { backgroundColor: '#FF950015' }]}>
              <Text style={[medStyles.miniStatVal, { color: '#FF9500' }]}>
                {data.skippedCount}
              </Text>
              <Text style={[medStyles.miniStatLabel, { color: c.textTertiary }]}>Skipped</Text>
            </View>
            <View style={[medStyles.miniStat, { backgroundColor: '#FF3B3015' }]}>
              <Text style={[medStyles.miniStatVal, { color: '#FF3B30' }]}>
                {data.missedCount}
              </Text>
              <Text style={[medStyles.miniStatLabel, { color: c.textTertiary }]}>Missed</Text>
            </View>
            <View style={[medStyles.miniStat, { backgroundColor: '#007AFF15' }]}>
              <Text style={[medStyles.miniStatVal, { color: '#007AFF' }]}>
                ⭐ {data.bestStreak}
              </Text>
              <Text style={[medStyles.miniStatLabel, { color: c.textTertiary }]}>Best</Text>
            </View>
          </View>

          {/* Per-Time Slot Breakdown */}
          {timeSlots.length > 0 && (
            <View style={medStyles.timeSlotsSection}>
              <Text style={[medStyles.timeSlotHeader, { color: c.textSecondary }]}>
                Per-Time Slot
              </Text>
              {timeSlots.map((slot) => (
                <View key={slot.time} style={medStyles.timeSlotRow}>
                  <Text style={[medStyles.timeSlotTime, { color: c.textPrimary }]}>
                    {formatTime(slot.time)}
                  </Text>
                  <View style={[medStyles.timeSlotBar, { backgroundColor: c.surface }]}>
                    <View
                      style={[
                        medStyles.timeSlotBarFill,
                        {
                          width: `${slot.pct}%`,
                          backgroundColor: adherenceColor(slot.pct),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[medStyles.timeSlotPct, { color: c.textSecondary }]}>
                    {slot.taken}/{slot.total}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Mini daily trend */}
          <View style={medStyles.miniTrendSection}>
            <Text style={[medStyles.timeSlotHeader, { color: c.textSecondary }]}>
              Daily Trend
            </Text>
            <View style={medStyles.miniTrendRow}>
              {data.dailyTrend.map((day) => {
                if (day.pct === -1) return null; // not scheduled
                const dotColor = adherenceColor(day.pct);
                return (
                  <View key={day.date} style={medStyles.miniTrendDot}>
                    <View
                      style={[
                        medStyles.trendDotCircle,
                        { backgroundColor: dotColor },
                      ]}
                    />
                    <Text style={[medStyles.miniTrendLabel, { color: c.textTertiary }]}>
                      {day.label.charAt(0)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Last taken */}
          {data.lastTakenDate && (
            <Text style={[medStyles.lastTaken, { color: c.textTertiary }]}>
              Last taken: {data.lastTakenDate}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

/* ── Helpers ── */

function SummaryRow({
  label,
  value,
  valueColor,
  colors: c,
}: {
  label: string;
  value: string;
  valueColor?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: valueColor ?? c.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { ...typography.sizes.title2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  exportBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },

  /* Period Selector */
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  periodChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  periodChipText: { fontSize: 13, fontWeight: '600' },

  /* Hero Card */
  heroCard: {
    borderRadius: radii.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  heroLabel: { ...typography.sizes.subhead, marginBottom: 4 },
  heroValue: { fontSize: 48, fontWeight: '800', letterSpacing: -2 },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroProgressTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 5 },
  heroSubtext: { ...typography.sizes.caption1, marginTop: spacing.sm },

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
  statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { ...typography.sizes.caption1, fontWeight: '500', marginTop: 2 },

  /* Section */
  section: { borderRadius: radii.card, padding: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { ...typography.sizes.headline, marginBottom: spacing.md },

  /* Trend Chart */
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
  },
  trendBarCol: { alignItems: 'center', flex: 1, gap: 4 },
  trendPctLabel: { fontSize: 9, fontWeight: '600' },
  trendBarTrack: {
    width: '65%',
    height: 100,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  trendBarFill: { width: '100%', borderRadius: 6 },
  trendDayLabel: { fontSize: 10, fontWeight: '500' },

  /* Distribution */
  distBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  distSegment: { height: '100%' },
  distLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  distLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distDot: { width: 10, height: 10, borderRadius: 5 },
  distLegendText: { fontSize: 12, fontWeight: '500' },

  /* Time of Day */
  todGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  todCard: {
    width: (SCREEN_W - spacing.md * 2 - spacing.lg * 2 - spacing.sm) / 2 - 1,
    borderRadius: radii.md,
    padding: spacing.sm + 4,
    alignItems: 'center',
    gap: 2,
  },
  todIcon: { fontSize: 20, marginBottom: 2 },
  todLabel: { fontSize: 12, fontWeight: '600' },
  todPct: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  todSub: { fontSize: 10 },

  /* Summary */
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: { ...typography.sizes.body },
  summaryValue: { ...typography.sizes.headline },
  divider: { height: StyleSheet.hairlineWidth },

  emptyText: { ...typography.sizes.body, textAlign: 'center', paddingVertical: spacing.lg },

  sheetHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 4,
  },
  sheetHeaderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sheetTitle: {
    ...typography.sizes.headline,
  },
  sheetSubtitle: {
    ...typography.sizes.caption1,
  },
  medPickerList: {
    gap: spacing.xs,
  },
  medPickerItem: {
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  medPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  medPickerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medPickerName: {
    ...typography.sizes.subhead,
    fontWeight: '600',
  },
  medPickerMeta: {
    ...typography.sizes.caption2,
    marginTop: 1,
  },
  medPickerRight: {
    marginLeft: spacing.xs,
  },
});

/* ── Med Card Styles ── */

const medStyles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  medName: { ...typography.sizes.body, fontWeight: '600' },
  medSub: { fontSize: 11, marginTop: 1 },
  cardRight: { alignItems: 'flex-end', gap: 2 },
  pctBig: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },

  /* Compact bar */
  compactBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  compactBarFill: { height: '100%', borderRadius: 3 },

  /* Expanded */
  expandedArea: { marginTop: spacing.md, gap: spacing.md },

  miniStatsRow: { flexDirection: 'row', gap: spacing.xs },
  miniStat: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  miniStatVal: { fontSize: 18, fontWeight: '700' },
  miniStatLabel: { fontSize: 10, fontWeight: '500', marginTop: 1 },

  /* Time Slots */
  timeSlotsSection: { gap: spacing.xs },
  timeSlotHeader: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  timeSlotTime: { fontSize: 12, fontWeight: '500', width: 65 },
  timeSlotBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  timeSlotBarFill: { height: '100%', borderRadius: 4 },
  timeSlotPct: { fontSize: 11, fontWeight: '600', width: 36, textAlign: 'right' },

  /* Mini Trend */
  miniTrendSection: { gap: spacing.xs },
  miniTrendRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  miniTrendDot: { alignItems: 'center', gap: 2 },
  trendDotCircle: { width: 12, height: 12, borderRadius: 6 },
  miniTrendLabel: { fontSize: 9, fontWeight: '500' },

  lastTaken: { fontSize: 11, fontStyle: 'italic' },
});
