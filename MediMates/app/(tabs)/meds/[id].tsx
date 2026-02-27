/**
 * Medication detail screen
 *
 * Modern hero card with animated pill icon, name/subtitle, daily dosage & frequency
 * stat boxes, interactive schedule time list, pause/delete actions.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Card } from '@/src/design-system/components/card';
import { Button } from '@/src/design-system/components/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useMeds, useDeleteMed, useUpdateMed } from '@/src/features/meds/hooks/use-meds';
import {
  FREQUENCY_LABELS,
  ICON_FOR_FORM,
  MEDICATION_FORMS,
  ROUTES_OF_ADMINISTRATION,
  MEAL_RELATION_OPTIONS,
  DURATION_OPTIONS,
  REMINDER_TIMING_OPTIONS,
} from '@/src/features/meds/types';
import { formatTime } from '@/src/lib/utils';
import { useUIStore } from '@/src/stores/ui-store';
import type { MedicationForm } from '@/src/types/firebase';

export default function MedDetailScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: meds } = useMeds();
  const deleteMed = useDeleteMed();
  const updateMed = useUpdateMed();
  const showToast = useUIStore((s) => s.showToast);

  const med = meds?.find((m) => m.id === id);

  // Track which times are "taken" locally
  const [takenTimes, setTakenTimes] = useState<string[]>(() => {
    if (med && med.schedule.times.length > 0) {
      return [med.schedule.times[0]!];
    }
    return [];
  });

  const toggleTime = useCallback(
    (time: string) => {
      setTakenTimes((prev) =>
        prev.includes(time)
          ? prev.filter((t) => t !== time)
          : [...prev, time],
      );
    },
    [],
  );

  if (!med) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={styles.emptyContainer}
        >
          <IconSymbol name="pill.fill" size={48} color={c.textTertiary} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>
            Medication not found.
          </Text>
        </MotiView>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert('Delete Medication', `Are you sure you want to delete ${med.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMed.mutate(med.id, {
            onSuccess: () => {
              showToast({ type: 'success', title: 'Deleted' });
              router.back();
            },
          });
        },
      },
    ]);
  };

  const handleTogglePause = () => {
    updateMed.mutate(
      { medId: med.id, updates: { paused: !med.paused } },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: med.paused ? `${med.name} resumed` : `${med.name} paused`,
          });
        },
      },
    );
  };

  // Calculate daily dosage
  const timesPerDay =
    med.schedule.frequency === 'every_x_hours' && med.schedule.intervalHours
      ? Math.floor(14 / med.schedule.intervalHours) + 1
      : med.schedule.times?.length || 1;
  const dosageNum = parseFloat(med.dosage) || 0;
  const dailyDosage = dosageNum * timesPerDay;

  const frequencyLabel = FREQUENCY_LABELS[med.schedule.frequency];

  // Form-aware icon
  const iconName = med.form
    ? ICON_FOR_FORM[med.form as MedicationForm] ?? 'pill.fill'
    : 'pill.fill';
  const formLabel = med.form
    ? MEDICATION_FORMS.find((f) => f.id === med.form)?.label
    : undefined;
  const routeLabel = med.route
    ? ROUTES_OF_ADMINISTRATION.find((r) => r.id === med.route)?.label
    : undefined;
  const mealLabel = med.mealRelation
    ? MEAL_RELATION_OPTIONS.find((m) => m.id === med.mealRelation)?.label
    : undefined;
  const durationLabel = med.treatmentDuration
    ? DURATION_OPTIONS.find((d) => d.id === med.treatmentDuration?.type)?.label
    : undefined;
  const reminderTimingLabel = med.reminderMinutesBefore !== undefined
    ? REMINDER_TIMING_OPTIONS.find((r) => r.value === med.reminderMinutesBefore)?.label
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <IconSymbol name="chevron.left" size={20} color={c.primary} />
          <Text style={[styles.backText, { color: c.primary }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.deleteBtn, { backgroundColor: c.errorLight }]}
          activeOpacity={0.7}
        >
          <IconSymbol name="trash" size={16} color={c.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <MotiView
          from={{ opacity: 0, translateY: 20, scale: 0.95 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 140 }}
        >
          <View style={[styles.heroCard, { backgroundColor: c.card, ...shadows.lg }]}>
            {/* Color accent strip */}
            <View style={[styles.heroAccent, { backgroundColor: med.color }]} />

            {/* Pill icon with glow */}
            <MotiView
              from={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 100 }}
            >
              <View
                style={[
                  styles.heroIconArea,
                  { backgroundColor: `${med.color}15` },
                ]}
              >
                <IconSymbol
                  name={iconName}
                  size={48}
                  color={med.color}
                />
              </View>
            </MotiView>

            {/* Name & info */}
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300, delay: 150 }}
            >
              <Text style={[styles.medName, { color: c.textPrimary }]}>
                {med.name}
              </Text>
              <Text style={[styles.medSubtitle, { color: c.textSecondary }]}>
                {med.dosage} {med.unit}
                {med.doseQuantity && med.doseQuantity !== 1 ? ` × ${med.doseQuantity}` : ''}
                {formLabel ? ` · ${formLabel}` : ''} · {frequencyLabel}
              </Text>
              {routeLabel || mealLabel ? (
                <Text style={[styles.medSubtitle, { color: c.textTertiary }]}>
                  {[routeLabel, mealLabel].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              {med.notes ? (
                <Text style={[styles.medNotes, { color: c.textTertiary }]}>
                  {med.notes}
                </Text>
              ) : null}
            </MotiView>

            {/* Paused badge */}
            {med.paused && (
              <MotiView
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                style={[styles.pausedBadge, { backgroundColor: c.warningLight }]}
              >
                <IconSymbol name="pause.fill" size={10} color={c.warning} />
                <Text style={[styles.pausedText, { color: c.warning }]}>
                  Paused
                </Text>
              </MotiView>
            )}

            {/* Stat boxes */}
            <View style={styles.statsRow}>
              <MotiView
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 300, delay: 200 }}
                style={[styles.statBox, { backgroundColor: c.surface }]}
              >
                <IconSymbol name="pill.fill" size={18} color={c.primary} />
                <Text style={[styles.statValue, { color: c.textPrimary }]}>
                  {dailyDosage} {med.unit}
                </Text>
                <Text style={[styles.statLabel, { color: c.textSecondary }]}>
                  Daily Dosage
                </Text>
              </MotiView>
              <MotiView
                from={{ opacity: 0, translateX: 10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 300, delay: 250 }}
                style={[styles.statBox, { backgroundColor: c.surface }]}
              >
                <IconSymbol name="clock.fill" size={18} color={c.primary} />
                <Text style={[styles.statValue, { color: c.textPrimary }]}>
                  {timesPerDay}x
                </Text>
                <Text style={[styles.statLabel, { color: c.textSecondary }]}>
                  Per Day
                </Text>
              </MotiView>
              <MotiView
                from={{ opacity: 0, translateX: 10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 300, delay: 300 }}
                style={[styles.statBox, { backgroundColor: c.surface }]}
              >
                <IconSymbol
                  name={med.reminderEnabled ? 'bell.fill' : 'bell.slash'}
                  size={18}
                  color={med.reminderEnabled ? c.success : c.textTertiary}
                />
                <Text style={[styles.statValue, { color: c.textPrimary }]}>
                  {med.reminderEnabled ? 'On' : 'Off'}
                </Text>
                <Text style={[styles.statLabel, { color: c.textSecondary }]}>
                  Reminders
                </Text>
              </MotiView>
            </View>
          </View>
        </MotiView>

        {/* Schedule section */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 300 }}
        >
          <View style={styles.scheduleHeader}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
              Schedule
            </Text>
            <View style={[styles.freqBadge, { backgroundColor: c.primaryLight }]}>
              <Text style={[styles.freqBadgeText, { color: c.primary }]}>
                {frequencyLabel}
              </Text>
            </View>
          </View>

          <View style={[styles.scheduleCard, { backgroundColor: c.card, ...shadows.sm }]}>
            {med.schedule.times.length > 0 ? (
              med.schedule.times.map((time, index) => {
                const isTaken = takenTimes.includes(time);
                return (
                  <MotiView
                    key={time}
                    from={{ opacity: 0, translateX: -12 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'timing', duration: 200, delay: 350 + index * 60 }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.scheduleRow,
                        index < med.schedule.times.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: c.separator,
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => toggleTime(time)}
                    >
                      <View style={styles.scheduleLeft}>
                        <View
                          style={[
                            styles.timeDot,
                            { backgroundColor: isTaken ? c.success : med.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.scheduleTime,
                            { color: c.textPrimary },
                            isTaken && { textDecorationLine: 'line-through', color: c.textTertiary },
                          ]}
                        >
                          {formatTime(time)}
                        </Text>
                        <Text style={[styles.dosageLabel, { color: c.textSecondary }]}>
                          {med.dosage} {med.unit}
                        </Text>
                      </View>
                      <MotiView
                        animate={{
                          scale: isTaken ? 1 : 0.9,
                          backgroundColor: isTaken ? c.success : 'transparent',
                          borderColor: isTaken ? c.success : c.border,
                        }}
                        transition={{ type: 'spring', damping: 15 }}
                        style={styles.checkCircle}
                      >
                        {isTaken && (
                          <IconSymbol name="checkmark" size={12} color="#FFFFFF" />
                        )}
                      </MotiView>
                    </TouchableOpacity>
                  </MotiView>
                );
              })
            ) : (
              <View style={styles.noTimesRow}>
                <Text style={[styles.noTimesText, { color: c.textSecondary }]}>
                  {med.schedule.frequency === 'as_needed'
                    ? 'Take as needed — no fixed schedule'
                    : med.schedule.frequency === 'every_x_hours'
                      ? `Every ${med.schedule.intervalHours ?? '?'} hours`
                      : 'No times set'}
                </Text>
              </View>
            )}
          </View>
        </MotiView>

        {/* Action buttons */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 350 }}
        >
          {/* Treatment details card */}
          {(durationLabel || med.refill?.enabled || reminderTimingLabel) && (
            <View style={[styles.detailsCard, { backgroundColor: c.card, ...shadows.sm }]}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary, marginBottom: spacing.sm }]}>
                Treatment Details
              </Text>

              {durationLabel && (
                <View style={styles.detailRow}>
                  <IconSymbol name="hourglass" size={16} color={c.primary} />
                  <View style={styles.detailTexts}>
                    <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Duration</Text>
                    <Text style={[styles.detailValue, { color: c.textPrimary }]}>
                      {durationLabel}
                      {med.treatmentDuration?.value
                        ? ` — ${med.treatmentDuration.value} ${med.treatmentDuration.type === 'days' ? 'days' : med.treatmentDuration.type === 'weeks' ? 'weeks' : 'months'}`
                        : ''}
                    </Text>
                  </View>
                </View>
              )}

              {reminderTimingLabel && (
                <View style={styles.detailRow}>
                  <IconSymbol name="bell.fill" size={16} color={c.primary} />
                  <View style={styles.detailTexts}>
                    <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Reminder</Text>
                    <Text style={[styles.detailValue, { color: c.textPrimary }]}>
                      {reminderTimingLabel}
                    </Text>
                  </View>
                </View>
              )}

              {med.refill?.enabled && (
                <View style={styles.detailRow}>
                  <IconSymbol name="arrow.triangle.2.circlepath" size={16} color={c.primary} />
                  <View style={styles.detailTexts}>
                    <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Refill Tracking</Text>
                    <Text style={[styles.detailValue, { color: c.textPrimary }]}>
                      {med.refill.currentStock != null ? `${med.refill.currentStock} in stock` : 'Enabled'}
                      {med.refill.refillAt ? ` · Remind at ${med.refill.refillAt}` : ''}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </MotiView>

        {/* Action buttons */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 400 }}
          style={styles.actionsSection}
        >
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.surface }]}
            activeOpacity={0.7}
            onPress={handleTogglePause}
          >
            <IconSymbol
              name={med.paused ? 'play.fill' : 'pause.fill'}
              size={18}
              color={c.warning}
            />
            <Text style={[styles.actionText, { color: c.textPrimary }]}>
              {med.paused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.surface }]}
            activeOpacity={0.7}
          >
            <IconSymbol name="square.and.arrow.up" size={18} color={c.primary} />
            <Text style={[styles.actionText, { color: c.textPrimary }]}>
              Export PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.errorLight }]}
            activeOpacity={0.7}
            onPress={handleDelete}
          >
            <IconSymbol name="trash" size={18} color={c.error} />
            <Text style={[styles.actionText, { color: c.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </MotiView>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Log button */}
      <MotiView
        from={{ translateY: 60, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 18, delay: 400 }}
        style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}
      >
        <TouchableOpacity
          style={[styles.logBtn, { backgroundColor: c.primary, ...shadows.md }]}
          activeOpacity={0.85}
        >
          <IconSymbol name="checkmark.circle.fill" size={20} color="#FFFFFF" />
          <Text style={styles.logBtnText}>Log Medication</Text>
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  backText: {
    ...typography.sizes.body,
    fontWeight: '500',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  heroCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  heroIconArea: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  medName: {
    ...typography.sizes.title1,
    marginBottom: 4,
    textAlign: 'center',
  },
  medSubtitle: {
    ...typography.sizes.subhead,
    marginBottom: 4,
    textAlign: 'center',
  },
  medNotes: {
    ...typography.sizes.caption1,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginBottom: spacing.sm,
  },
  pausedText: {
    ...typography.sizes.caption2,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.md,
  },
  statBox: {
    flex: 1,
    borderRadius: radii.md,
    padding: spacing.sm + 4,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    ...typography.sizes.headline,
  },
  statLabel: {
    ...typography.sizes.caption1,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    ...typography.sizes.title3,
  },
  freqBadge: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  freqBadgeText: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },
  scheduleCard: {
    borderRadius: radii.card,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scheduleTime: {
    ...typography.sizes.body,
    fontWeight: '600',
  },
  dosageLabel: {
    ...typography.sizes.caption1,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTimesRow: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  noTimesText: {
    ...typography.sizes.body,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.md,
  },
  actionText: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  logBtn: {
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logBtnText: {
    color: '#FFFFFF',
    ...typography.sizes.headline,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.sizes.body,
    textAlign: 'center',
  },
  detailsCard: {
    borderRadius: radii.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailTexts: {
    flex: 1,
  },
  detailLabel: {
    ...typography.sizes.caption1,
    fontWeight: '500',
  },
  detailValue: {
    ...typography.sizes.body,
    fontWeight: '500',
    marginTop: 1,
  },
});
