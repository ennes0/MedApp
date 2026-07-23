/**
 * LogDoseSheet — Bottom-slide modal for logging a dose
 *
 * Three actions: Take, Skip, Snooze
 * Clean layout with pill hero, rich info cards, large action buttons.
 * Uses native slide animation for smooth entry/exit.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { formatTime } from '@/src/lib/utils';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ScheduledDose, DoseStatus } from '@/src/types/firebase';
import { useTranslation } from 'react-i18next';

interface LogDoseSheetProps {
  dose: ScheduledDose | null;
  onLog: (dose: ScheduledDose, status: DoseStatus, note: string) => void;
  canEdit?: boolean;
  onDismiss: () => void;
}

export function LogDoseSheet({ dose, onLog, canEdit = true, onDismiss }: LogDoseSheetProps) {
  const c = useColors();
  const { isDark } = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState('');
  const translateY = useSharedValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const isBeforeScheduledTime = useCallback((scheduledTime: string) => {
    const [hStr, mStr] = scheduledTime.split(':');
    const scheduledMinutes = Number(hStr) * 60 + Number(mStr);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return nowMinutes < scheduledMinutes;
  }, []);

  const commitAction = useCallback(
    (status: DoseStatus) => {
      if (!dose) return;
      if (!canEdit) return;
      onLog(dose, status, note);
      setNote('');
      onDismiss();
    },
    [canEdit, dose, note, onLog, onDismiss],
  );

  const handleAction = useCallback(
    (status: DoseStatus) => {
      if (!dose || !canEdit) return;

      const needsEarlyConfirmation =
        (status === 'taken' || status === 'skipped') && isBeforeScheduledTime(dose.scheduledTime);

      if (needsEarlyConfirmation) {
        Alert.alert(
          t('logDose.confirmTitle'),
          t('logDose.confirmMessage', { time: formatTime(dose.scheduledTime) }),
          [
            { text: t('profile.cancel'), style: 'cancel' },
            {
              text: status === 'taken' ? t('logDose.markTaken') : t('logDose.markSkipped'),
              style: status === 'skipped' ? 'destructive' : 'default',
              onPress: () => commitAction(status),
            },
          ],
        );
        return;
      }

      commitAction(status);
    },
    [canEdit, commitAction, dose, isBeforeScheduledTime, t],
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        if (!isDragging) {
          runOnJS(setIsDragging)(true);
        }
      }
    })
    .onEnd((event) => {
      if (event.translationY > 150 || event.velocityY > 800) {
        translateY.value = withSpring(600, { damping: 20, stiffness: 200 });
        runOnJS(onDismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
      runOnJS(setIsDragging)(false);
    });

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!dose) return null;

  const isTaken = dose.status === 'taken';
  const isSkipped = dose.status === 'skipped';
  const isLogged = isTaken || isSkipped;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </View>

      {/* Slide-up sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sheet,
            {
              // Give the medication sheet its own app-blue surface in light
              // mode, while keeping the dark-mode treatment deliberately black.
              backgroundColor: isDark ? '#000000' : c.primaryLight,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
            animatedSheetStyle,
          ]}
        >
          {/* ── Close bar + button ── */}
          <View style={styles.sheetHeader}>
          <View style={[styles.handleBar, { backgroundColor: c.textTertiary }]} />
          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.7}
            style={[styles.closeBtn, { backgroundColor: c.surface }]}
          >
            <IconSymbol name="xmark" size={14} color={c.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* ── Hero icon with ring ── */}
          <View style={styles.heroSection}>
            <View
              style={[
                styles.heroRing,
                {
                  backgroundColor: `${dose.medColor}12`,
                  borderColor: `${dose.medColor}28`,
                },
              ]}
            >
              <View
                style={[
                  styles.heroInner,
                  { backgroundColor: `${dose.medColor}20` },
                ]}
              >
                <IconSymbol name="pill.fill" size={40} color={dose.medColor} />
              </View>
            </View>
          </View>

          {/* ── Med name & dosage ── */}
          <View style={styles.infoSection}>
            <Text style={[styles.medName, { color: c.textPrimary }]}>
              {dose.medName}
            </Text>
            <Text style={[styles.dosageText, { color: c.textSecondary }]}>
              {dose.dosage} {dose.unit}
            </Text>
          </View>

          {/* ── Info cards row ── */}
          <View style={styles.infoCards}>
            <View style={[styles.infoCard, { backgroundColor: c.surface }]}>
              <IconSymbol name="clock.fill" size={18} color={c.primary} />
              <Text style={[styles.infoCardLabel, { color: c.textTertiary }]}>
                {t('logDose.scheduled')}
              </Text>
              <Text style={[styles.infoCardValue, { color: c.textPrimary }]}>
                {formatTime(dose.scheduledTime)}
              </Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: c.surface }]}>
              <IconSymbol name="pills.fill" size={18} color={dose.medColor} />
              <Text style={[styles.infoCardLabel, { color: c.textTertiary }]}>
                {t('logDose.dosage')}
              </Text>
              <Text style={[styles.infoCardValue, { color: c.textPrimary }]}>
                {dose.dosage} {dose.unit}
              </Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: c.surface }]}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isLogged
                      ? isTaken
                        ? c.success
                        : c.warning
                      : c.textTertiary,
                  },
                ]}
              />
              <Text style={[styles.infoCardLabel, { color: c.textTertiary }]}>
                {t('logDose.status')}
              </Text>
              <Text
                style={[
                  styles.infoCardValue,
                  {
                    color: isLogged
                      ? isTaken
                        ? c.success
                        : c.warning
                      : c.textPrimary,
                  },
                ]}
              >
                {isTaken ? t('logDose.taken') : isSkipped ? t('logDose.skipped') : t('logDose.pending')}
              </Text>
            </View>
          </View>

          {/* ── Already-logged badge ── */}
          {isLogged && (
            <View style={styles.loggedBadgeRow}>
              <View
                style={[
                  styles.loggedBadge,
                  {
                    backgroundColor: isTaken ? c.successLight : c.warningLight,
                  },
                ]}
              >
                <IconSymbol
                  name={isTaken ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                  size={18}
                  color={isTaken ? c.success : c.warning}
                />
                <Text
                  style={[
                    styles.loggedBadgeText,
                    { color: isTaken ? c.success : c.warning },
                  ]}
                >
                  {isTaken
                    ? t('logDose.alreadyTaken')
                    : t('logDose.wasSkipped')}
                </Text>
              </View>
            </View>
          )}

          {!canEdit && (
            <View style={styles.readOnlyBannerWrap}>
              <View style={[styles.readOnlyBanner, { backgroundColor: c.primaryLight }]}>
                <IconSymbol name="lock.fill" size={16} color={c.primary} />
                <Text style={[styles.readOnlyBannerText, { color: c.primary }]}>
                  {t('logDose.readOnly')}
                </Text>
              </View>
            </View>
          )}

          {/* ── Action buttons ── */}
          <View style={styles.actions}>
            {/* Take — large primary */}
            <TouchableOpacity
              style={[
                styles.takeBtn,
                { backgroundColor: c.success },
                !canEdit && styles.disabledAction,
              ]}
              activeOpacity={0.8}
              disabled={!canEdit}
              onPress={() => handleAction('taken')}
            >
              <View style={styles.takeBtnIcon}>
                <IconSymbol name="checkmark" size={22} color="#fff" />
              </View>
              <View style={styles.takeBtnText}>
                <Text style={styles.takeBtnTitle}>{t('logDose.takeDose')}</Text>
                <Text style={styles.takeBtnSub}>
                  {t('logDose.takeSub', { time: formatTime(dose.scheduledTime) })}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Skip & Snooze */}
            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  { backgroundColor: c.surface },
                  !canEdit && styles.disabledAction,
                ]}
                activeOpacity={0.7}
                disabled={!canEdit}
                onPress={() => handleAction('skipped')}
              >
                <View
                  style={[
                    styles.secondaryIcon,
                    { backgroundColor: c.warningLight },
                  ]}
                >
                  <IconSymbol name="xmark" size={14} color={c.warning} />
                </View>
                <Text style={[styles.secondaryLabel, { color: c.textPrimary }]}>
                  {t('logDose.skip')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  { backgroundColor: c.surface },
                  !canEdit && styles.disabledAction,
                ]}
                activeOpacity={0.7}
                disabled={!canEdit}
                onPress={() => handleAction('snoozed')}
              >
                <View
                  style={[
                    styles.secondaryIcon,
                    { backgroundColor: c.primaryLight },
                  ]}
                >
                  <IconSymbol name="clock.badge" size={14} color={c.primary} />
                </View>
                <Text style={[styles.secondaryLabel, { color: c.textPrimary }]}>
                  {t('logDose.snooze')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /* Backdrop */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  /* Sheet container */
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: radii.sheet + 4,
    borderTopRightRadius: radii.sheet + 4,
    maxHeight: '88%',
    ...shadows.xl,
  },

  /* Header */
  sheetHeader: {
    alignItems: 'center',
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.sm + 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  /* Hero */
  heroSection: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  heroRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Info */
  infoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: 4,
  },
  medName: {
    ...typography.sizes.title1,
    textAlign: 'center',
  },
  dosageText: {
    ...typography.sizes.body,
    textAlign: 'center',
  },

  /* Info cards */
  infoCards: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.card,
    gap: 6,
  },
  infoCardLabel: {
    ...typography.sizes.caption2,
    fontWeight: '500',
  },
  infoCardValue: {
    ...typography.sizes.headline,
    textAlign: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  /* Logged badge */
  loggedBadgeRow: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  loggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.full,
  },
  loggedBadgeText: {
    ...typography.sizes.subhead,
    fontWeight: '600',
  },
  readOnlyBannerWrap: {
    marginBottom: spacing.lg,
  },
  readOnlyBanner: {
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  readOnlyBannerText: {
    ...typography.sizes.footnote,
    flex: 1,
    fontWeight: '600',
  },

  /* Actions */
  actions: {
    gap: spacing.sm + 4,
  },
  disabledAction: {
    opacity: 0.45,
  },
  takeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  takeBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  takeBtnText: {
    flex: 1,
  },
  takeBtnTitle: {
    ...typography.sizes.headline,
    color: '#fff',
  },
  takeBtnSub: {
    ...typography.sizes.caption1,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
  },
  secondaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    ...typography.sizes.callout,
    fontWeight: '600',
  },
});
