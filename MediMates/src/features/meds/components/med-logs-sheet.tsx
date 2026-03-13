import React, { useCallback, useEffect, useMemo } from 'react';
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

interface MedLogPoint {
  date: string;
  taken: number;
}

interface MedLogItem extends DoseLogEntry {
  date: string;
}

const CHART_DAYS = 14;
const FETCH_DAYS = 90;

export function MedLogsSheet({ visible, med, onClose }: MedLogsSheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const translateY = useSharedValue(620);
  const backdropOpacity = useSharedValue(0);

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

  const chartData = useMemo<MedLogPoint[]>(() => {
    const byDate = new Map<string, number>();
    for (const entry of medEntries) {
      if (entry.status !== 'taken') continue;
      byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + 1);
    }

    const points: MedLogPoint[] = [];
    for (let i = CHART_DAYS - 1; i >= 0; i--) {
      const dt = subDays(new Date(), i);
      const dateKey = format(dt, 'yyyy-MM-dd');
      points.push({
        date: dateKey,
        taken: byDate.get(dateKey) ?? 0,
      });
    }
    return points;
  }, [medEntries]);

  const maxTakenPerDay = Math.max(1, ...chartData.map((d) => d.taken));

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

          <View style={[styles.chartCard, { backgroundColor: c.surface, ...shadows.sm }]}> 
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Last 14 Days</Text>
            {isLoading ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Loading logs...</Text>
            ) : (
              <View style={styles.chartRow}>
                {chartData.map((point, index) => {
                  const h = Math.max(6, (point.taken / maxTakenPerDay) * 92);
                  const showLabel = index % 3 === 0 || index === chartData.length - 1;
                  return (
                    <View key={point.date} style={styles.barCol}>
                      <View style={[styles.barTrack, { backgroundColor: c.separator }]}> 
                        <View
                          style={[
                            styles.barFill,
                            { height: h, backgroundColor: med.color },
                          ]}
                        />
                      </View>
                      <Text style={[styles.barValue, { color: c.textSecondary }]}> 
                        {point.taken}
                      </Text>
                      <Text style={[styles.barLabel, { color: c.textTertiary }]}> 
                        {showLabel ? format(new Date(`${point.date}T00:00:00`), 'dd') : ' '}
                      </Text>
                    </View>
                  );
                })}
              </View>
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
  chartCard: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.sizes.headline,
    marginBottom: spacing.sm,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: 92,
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
  },
  barValue: {
    ...typography.sizes.caption2,
    marginTop: 4,
  },
  barLabel: {
    ...typography.sizes.caption2,
    marginTop: 2,
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
