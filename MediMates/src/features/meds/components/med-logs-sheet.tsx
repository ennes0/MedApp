import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInLeft,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  getDay,
  startOfMonth,
} from 'date-fns';
import { db } from '@/src/lib/firebase';
import { useAuthStore } from '@/src/stores/auth-store';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { formatTime } from '@/src/lib/utils';
import type { DayLog, DoseLogEntry, Medication } from '@/src/types/firebase';

interface MedLogsSheetProps {
  visible: boolean;
  med: Medication;
  onClose: () => void;
}

interface MedLogItem extends DoseLogEntry {
  date: string;
}

const FETCH_DAYS = 90;
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type CalendarDayStatus =
  | 'taken'
  | 'partial'
  | 'skipped'
  | 'missed'
  | 'pending'
  | 'idle'
  | 'out_of_range';

interface CalendarStatusInfo {
  status: CalendarDayStatus;
  scheduledCount: number;
  takenCount: number;
}

function isMedScheduledForDate(med: Medication, dateStr: string): boolean {
  if (med.paused) return false;

  const startDate = med.schedule.startDate;
  if (startDate && dateStr < startDate) return false;

  const duration = med.treatmentDuration;
  if (duration && duration.type !== 'ongoing') {
    const medStart = med.schedule.startDate
      ? new Date(med.schedule.startDate)
      : med.createdAt?.toDate?.() ?? new Date();
    const target = new Date(dateStr);
    const daysDiff = differenceInCalendarDays(target, medStart);

    switch (duration.type) {
      case 'until_date':
        if (duration.endDate && dateStr > duration.endDate) return false;
        break;
      case 'specific_days':
        if (duration.value && daysDiff >= duration.value) return false;
        break;
      case 'specific_weeks':
        if (duration.value && daysDiff >= duration.value * 7) return false;
        break;
      case 'specific_months':
        if (duration.value && daysDiff >= duration.value * 30) return false;
        break;
    }
  }

  const targetDate = new Date(dateStr);
  const dayOfWeek = targetDate.getDay();
  const { frequency } = med.schedule;

  switch (frequency) {
    case 'daily':
    case 'every_x_hours':
    case 'x_times_daily':
      return true;
    case 'as_needed':
      return false;
    case 'specific_days':
    case 'weekly': {
      const days = med.schedule.days ?? med.schedule.daysOfWeek ?? [];
      return days.includes(dayOfWeek);
    }
    case 'monthly': {
      const dom = med.schedule.dayOfMonth ?? 1;
      return targetDate.getDate() === dom;
    }
    case 'cyclical': {
      const cycleDaysOn = med.schedule.cycleDaysOn ?? 21;
      const cycleDaysOff = med.schedule.cycleDaysOff ?? 7;
      const cycleLength = cycleDaysOn + cycleDaysOff;
      const medStart = med.schedule.startDate
        ? new Date(med.schedule.startDate)
        : med.createdAt?.toDate?.() ?? new Date();
      const daysSinceStart = differenceInCalendarDays(targetDate, medStart);
      if (daysSinceStart < 0) return false;
      return (daysSinceStart % cycleLength) < cycleDaysOn;
    }
    default:
      return true;
  }
}

function getTimeSlotsForMed(med: Medication): string[] {
  const { frequency, times, intervalHours, timesPerDay } = med.schedule;

  if (frequency === 'as_needed') return [];

  if (frequency === 'every_x_hours' && intervalHours && intervalHours > 0) {
    if (times && times.length > 0) return times;

    const generated: string[] = [];
    for (let h = 8; h <= 22; h += intervalHours) {
      const hh = String(Math.floor(h)).padStart(2, '0');
      const mm = String(Math.round((h % 1) * 60)).padStart(2, '0');
      generated.push(`${hh}:${mm}`);
    }
    return generated;
  }

  if (frequency === 'x_times_daily') {
    if (times && times.length > 0) return times;
    const count = timesPerDay ?? 2;
    const generated: string[] = [];
    const startHour = 7;
    const endHour = 22;
    const span = endHour - startHour;
    const interval = span / count;
    for (let i = 0; i < count; i++) {
      const h = Math.round(startHour + i * interval);
      generated.push(`${String(h).padStart(2, '0')}:00`);
    }
    return generated;
  }

  return times ?? [];
}

export function MedLogsSheet({ visible, med, onClose }: MedLogsSheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const translateY = useSharedValue(620);
  const backdropOpacity = useSharedValue(0);
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));

  const closeWithAnimation = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 120 });
    translateY.value = withTiming(620, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }, [backdropOpacity, onClose, translateY]);

  useEffect(() => {
    if (!visible) {
      translateY.value = 620;
      backdropOpacity.value = 0;
      return;
    }

    backdropOpacity.value = withTiming(1, { duration: 140 });
    translateY.value = withSpring(0, {
      damping: 22,
      stiffness: 220,
      mass: 0.9,
    });
  }, [visible, backdropOpacity, translateY]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 900) {
        runOnJS(closeWithAnimation)();
      } else {
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 220,
        });
      }
    });

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const startBoundary = useMemo(() => {
    const fallback = format(subDays(new Date(), FETCH_DAYS - 1), 'yyyy-MM-dd');
    if (!med.schedule.startDate) return fallback;
    return med.schedule.startDate > fallback ? med.schedule.startDate : fallback;
  }, [med.schedule.startDate]);

  const { data: dayLogs = [], isLoading } = useQuery({
    queryKey: ['medLogsByMed', user?.uid, med.id, startBoundary],
    enabled: visible && !!user,
    queryFn: async () => {
      if (!user) return [] as DayLog[];
      const q = query(
        collection(db, 'userMeds', user.uid, 'dayLogs'),
        where('date', '>=', startBoundary),
        orderBy('date', 'desc'),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as DayLog);
    },
  });

  const medEntries = useMemo<MedLogItem[]>(() => {
    const list: MedLogItem[] = [];
    for (const day of dayLogs) {
      const entries = day.entries ?? [];
      for (const entry of entries) {
        if (entry.medId === med.id) {
          list.push({ ...entry, date: day.date });
        }
      }
    }
    list.sort((a, b) => {
      if (a.date === b.date) return b.scheduledTime.localeCompare(a.scheduledTime);
      return b.date.localeCompare(a.date);
    });
    return list;
  }, [dayLogs, med.id]);

  const summary = useMemo(() => {
    const taken = medEntries.filter((e) => e.status === 'taken').length;
    const skipped = medEntries.filter((e) => e.status === 'skipped').length;
    const snoozed = medEntries.filter((e) => e.status === 'snoozed').length;
    const logged = medEntries.filter((e) => e.status !== 'pending').length;

    const lastTaken = medEntries.find((e) => e.status === 'taken')?.date ?? null;

    const takenDaySet = new Set(
      medEntries.filter((e) => e.status === 'taken').map((e) => e.date),
    );

    return {
      taken,
      skipped,
      snoozed,
      logged,
      takenDays: takenDaySet.size,
      adherencePct: logged > 0 ? Math.round((taken / logged) * 100) : 0,
      lastTaken,
    };
  }, [medEntries]);

  const recentTakenDays = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const entry of medEntries) {
      if (entry.status !== 'taken') continue;
      const arr = grouped.get(entry.date) ?? [];
      arr.push(entry.scheduledTime);
      grouped.set(entry.date, arr);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 10)
      .map(([date, times]) => ({
        date,
        times: times.sort(),
      }));
  }, [medEntries]);

  const startedOn = med.schedule.startDate
    ? med.schedule.startDate
    : format(med.createdAt.toDate(), 'yyyy-MM-dd');

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const medStartDate = useMemo(() => new Date(`${startedOn}T00:00:00`), [startedOn]);

  useEffect(() => {
    if (visible) {
      setDisplayMonth(startOfMonth(new Date()));
    }
  }, [visible]);

  const dailyCalendarStatus = useMemo(() => {
    const byDate = new Map<string, MedLogItem[]>();
    for (const entry of medEntries) {
      const list = byDate.get(entry.date) ?? [];
      list.push(entry);
      byDate.set(entry.date, list);
    }

    const map = new Map<string, CalendarStatusInfo>();
    const rangeStart = new Date(`${startedOn}T00:00:00`);
    const rangeEnd = new Date(`${todayKey}T00:00:00`);
    if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime()) || rangeStart > rangeEnd) {
      return map;
    }

    const scheduleTimes = getTimeSlotsForMed(med);
    const defaultScheduledCount = Math.max(1, scheduleTimes.length);

    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    for (const day of days) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const scheduled = isMedScheduledForDate(med, dateKey);

      if (!scheduled) {
        map.set(dateKey, { status: 'idle', scheduledCount: 0, takenCount: 0 });
        continue;
      }

      const entries = (byDate.get(dateKey) ?? []).filter((e) => e.medId === med.id);
      const takenCount = entries.filter((e) => e.status === 'taken').length;
      const skippedCount = entries.filter((e) => e.status === 'skipped').length;
      const pendingCount = entries.filter((e) => e.status === 'pending' || e.status === 'snoozed').length;

      const scheduledCount = entries.length > 0 ? Math.max(defaultScheduledCount, entries.length) : defaultScheduledCount;

      let status: CalendarDayStatus = 'missed';
      if (takenCount >= scheduledCount && scheduledCount > 0) {
        status = 'taken';
      } else if (takenCount > 0) {
        status = 'partial';
      } else if (skippedCount > 0) {
        status = 'skipped';
      } else if (dateKey === todayKey) {
        status = pendingCount > 0 ? 'pending' : 'missed';
      }

      map.set(dateKey, {
        status,
        scheduledCount,
        takenCount,
      });
    }

    return map;
  }, [med, medEntries, startedOn, todayKey]);

  const monthStart = useMemo(() => startOfMonth(displayMonth), [displayMonth]);
  const monthEnd = useMemo(() => endOfMonth(displayMonth), [displayMonth]);

  const canGoPrevMonth = monthStart > startOfMonth(medStartDate);
  const canGoNextMonth = monthStart < startOfMonth(new Date());

  const calendarCells = useMemo(() => {
    const startOffset = getDay(monthStart);
    const endOffset = 6 - getDay(monthEnd);
    const gridStart = subDays(monthStart, startOffset);
    const gridEnd = addDays(monthEnd, endOffset);

    return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const inMonth = day >= monthStart && day <= monthEnd;
      const inRange = dateKey >= startedOn && dateKey <= todayKey;
      const status = inRange
        ? dailyCalendarStatus.get(dateKey)?.status ?? 'idle'
        : 'out_of_range';

      return {
        dateKey,
        dayNumber: day.getDate(),
        inMonth,
        inRange,
        isToday: dateKey === todayKey,
        isStartDay: dateKey === startedOn,
        status,
      };
    });
  }, [monthStart, monthEnd, startedOn, todayKey, dailyCalendarStatus]);

  const getStatusIcon = useCallback((status: CalendarDayStatus) => {
    switch (status) {
      case 'taken':
        return 'checkmark.circle.fill';
      case 'partial':
        return 'checkmark.circle';
      case 'skipped':
        return 'xmark.circle.fill';
      case 'missed':
        return 'exclamationmark.circle.fill';
      case 'pending':
        return 'clock.fill';
      case 'idle':
        return 'minus.circle';
      default:
        return null;
    }
  }, []);

  const getStatusColor = useCallback((status: CalendarDayStatus) => {
    switch (status) {
      case 'taken':
      case 'partial':
        return c.success;
      case 'skipped':
        return c.warning;
      case 'missed':
        return c.error;
      case 'pending':
        return c.primary;
      case 'idle':
        return c.textTertiary;
      default:
        return c.textTertiary;
    }
  }, [c.error, c.primary, c.success, c.textTertiary, c.warning]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeWithAnimation}
    >
      <Animated.View style={[styles.backdrop, backdropAnimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeWithAnimation} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: c.card,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
          sheetAnimStyle,
        ]}
      >
        <View style={[styles.handleBar, { backgroundColor: c.textTertiary }]} />
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: c.textPrimary }]}>
              {med.name} Log
            </Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              Started on {startedOn}
            </Text>
          </View>
          <TouchableOpacity
            onPress={closeWithAnimation}
            activeOpacity={0.7}
            style={[styles.closeBtn, { backgroundColor: c.surface }]}
          >
            <IconSymbol name="xmark" size={14} color={c.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.statGrid}>
            <View style={[styles.statCard, { backgroundColor: c.surface }]}> 
              <Text style={[styles.statValue, { color: c.success }]}>{summary.taken}</Text>
              <Text style={[styles.statLabel, { color: c.textSecondary }]}>Taken</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: c.surface }]}> 
              <Text style={[styles.statValue, { color: c.primary }]}>{summary.adherencePct}%</Text>
              <Text style={[styles.statLabel, { color: c.textSecondary }]}>Adherence</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: c.surface }]}> 
              <Text style={[styles.statValue, { color: c.warning }]}>{summary.skipped}</Text>
              <Text style={[styles.statLabel, { color: c.textSecondary }]}>Skipped</Text>
            </View>
          </View>

          <View style={[styles.calendarCard, { backgroundColor: c.surface, ...shadows.sm }]}> 
            <View style={styles.calendarHeaderRow}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary, marginBottom: 0 }]}>Medication Calendar</Text>
              <View style={styles.calendarNavRow}>
                <TouchableOpacity
                  disabled={!canGoPrevMonth}
                  onPress={() => setDisplayMonth((prev) => startOfMonth(subDays(prev, 1)))}
                  activeOpacity={0.7}
                  style={[
                    styles.monthNavBtn,
                    { backgroundColor: canGoPrevMonth ? c.card : c.separator },
                  ]}
                >
                  <IconSymbol name="chevron.left" size={14} color={canGoPrevMonth ? c.textPrimary : c.textTertiary} />
                </TouchableOpacity>
                <Text style={[styles.monthLabel, { color: c.textPrimary }]}>
                  {format(monthStart, 'MMMM yyyy')}
                </Text>
                <TouchableOpacity
                  disabled={!canGoNextMonth}
                  onPress={() => setDisplayMonth((prev) => startOfMonth(addDays(endOfMonth(prev), 1)))}
                  activeOpacity={0.7}
                  style={[
                    styles.monthNavBtn,
                    { backgroundColor: canGoNextMonth ? c.card : c.separator },
                  ]}
                >
                  <IconSymbol name="chevron.right" size={14} color={canGoNextMonth ? c.textPrimary : c.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.calendarSubtitle, { color: c.textSecondary }]}>Tracking since {startedOn}</Text>

            {isLoading ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Loading logs...</Text>
            ) : (
              <>
                <View style={styles.weekHeaderRow}>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <Text key={`${label}-${index}`} style={[styles.weekHeaderText, { color: c.textTertiary }]}> 
                      {label}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarCells.map((cell) => {
                    const iconName = getStatusIcon(cell.status);
                    const iconColor = getStatusColor(cell.status);
                    const dimmed = !cell.inMonth || !cell.inRange;

                    return (
                      <View
                        key={cell.dateKey}
                        style={[
                          styles.calendarCell,
                          {
                            backgroundColor: cell.isToday ? c.primaryLight : c.card,
                            borderColor: cell.isStartDay ? med.color : c.border,
                            opacity: dimmed ? 0.28 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.calendarDay, { color: c.textPrimary }]}>{cell.dayNumber}</Text>
                        {iconName ? (
                          <IconSymbol name={iconName as any} size={13} color={iconColor} />
                        ) : (
                          <View style={styles.calendarIconSpacer} />
                        )}
                      </View>
                    );
                  })}
                </View>

                <View style={styles.legendRow}>
                  {[
                    { key: 'taken', label: 'Taken' },
                    { key: 'skipped', label: 'Skipped' },
                    { key: 'missed', label: 'Missed' },
                    { key: 'pending', label: 'Pending' },
                  ].map((item) => (
                    <View key={item.key} style={styles.legendItem}>
                      <IconSymbol
                        name={getStatusIcon(item.key as CalendarDayStatus) as any}
                        size={12}
                        color={getStatusColor(item.key as CalendarDayStatus)}
                      />
                      <Text style={[styles.legendText, { color: c.textSecondary }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={[styles.timelineCard, { backgroundColor: c.surface, ...shadows.sm }]}> 
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Recent Taken Days</Text>
            {recentTakenDays.length === 0 && !isLoading ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>No taken logs yet for this medication.</Text>
            ) : (
              recentTakenDays.map((row, index) => (
                <Animated.View
                  key={row.date}
                  entering={FadeInLeft.duration(220).delay(index * 35)}
                  style={[styles.timelineRow, { borderBottomColor: c.separator }]}
                >
                  <View>
                    <Text style={[styles.timelineDate, { color: c.textPrimary }]}> 
                      {format(new Date(`${row.date}T00:00:00`), 'MMM dd, yyyy')}
                    </Text>
                    <Text style={[styles.timelineSub, { color: c.textSecondary }]}> 
                      {row.times.length} dose{row.times.length === 1 ? '' : 's'} taken
                    </Text>
                  </View>
                  <Text style={[styles.timelineTimes, { color: c.primary }]}> 
                    {row.times.slice(0, 3).map(formatTime).join(' · ')}
                  </Text>
                </Animated.View>
              ))
            )}
          </View>

          <View style={[styles.noteCard, { backgroundColor: c.primaryLight }]}> 
            <IconSymbol name="stethoscope" size={16} color={c.primary} />
            <Text style={[styles.noteText, { color: c.primary }]}> 
              Doctor view: {summary.takenDays} active day{summary.takenDays === 1 ? '' : 's'} with confirmed intake
              {summary.lastTaken ? `, latest on ${summary.lastTaken}.` : '.'}
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheet: {
    marginTop: '22%',
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  handleBar: {
    width: 38,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    opacity: 0.4,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.sizes.title2,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.sizes.caption1,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    ...typography.sizes.title2,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.sizes.caption1,
    marginTop: 2,
  },
  calendarCard: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  calendarNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  monthNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    ...typography.sizes.subhead,
    fontWeight: '700',
    minWidth: 100,
    textAlign: 'center',
  },
  calendarSubtitle: {
    ...typography.sizes.caption1,
    marginBottom: spacing.sm,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  weekHeaderText: {
    ...typography.sizes.caption2,
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calendarCell: {
    width: '13.2%',
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  calendarDay: {
    ...typography.sizes.caption1,
    fontWeight: '700',
    lineHeight: 16,
  },
  calendarIconSpacer: {
    width: 13,
    height: 13,
  },
  legendRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    ...typography.sizes.caption2,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.sizes.headline,
    marginBottom: spacing.sm,
  },
  timelineCard: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
  timelineRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  timelineDate: {
    ...typography.sizes.subhead,
    fontWeight: '600',
  },
  timelineSub: {
    ...typography.sizes.caption1,
    marginTop: 2,
  },
  timelineTimes: {
    ...typography.sizes.caption1,
    fontWeight: '600',
    maxWidth: '45%',
    textAlign: 'right',
  },
  noteCard: {
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  noteText: {
    ...typography.sizes.caption1,
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.sizes.subhead,
    paddingVertical: spacing.sm,
  },
});
