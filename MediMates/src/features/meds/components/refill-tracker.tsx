/**
 * RefillTracker — Dynamic pill inventory gauge + refill status overview.
 *
 * Shows:
 *  - Animated circular progress ring per medication
 *  - Current stock / total stock
 *  - Color-coded urgency (green → yellow → red)
 *  - Summary bar: total meds tracking refill, how many are low
 *
 * Only renders for medications that have refill.enabled === true.
 */

import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useColors, useAppTheme } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import type { Medication } from '@/src/types/firebase';
import { useTranslation } from 'react-i18next';

interface RefillTrackerProps {
  meds: Medication[];
  onPressMed?: (med: Medication) => void;
}

// ── Urgency helpers ──

type Urgency = 'ok' | 'low' | 'critical' | 'empty';

function getUrgency(stock: number, remindAt: number): Urgency {
  if (stock <= 0) return 'empty';
  if (stock <= remindAt) return 'critical';
  if (stock <= remindAt * 2) return 'low';
  return 'ok';
}

function getUrgencyColor(urgency: Urgency, c: ReturnType<typeof useColors>) {
  switch (urgency) {
    case 'ok':
      return c.success;
    case 'low':
      return c.warning;
    case 'critical':
      return c.error;
    case 'empty':
      return c.textTertiary;
  }
}

function getUrgencyLabel(urgency: Urgency, t: (key: string) => string): string {
  switch (urgency) {
    case 'ok':
      return t('refillTracker.inStock');
    case 'low':
      return t('refillTracker.runningLow');
    case 'critical':
      return t('refillTracker.veryLow');
    case 'empty':
      return t('refillTracker.outOfStock');
  }
}

function getUrgencyIcon(urgency: Urgency): string {
  switch (urgency) {
    case 'ok':
      return 'checkmark.circle.fill';
    case 'low':
      return 'exclamationmark.triangle.fill';
    case 'critical':
      return 'exclamationmark.octagon.fill';
    case 'empty':
      return 'xmark.circle.fill';
  }
}

// ── Progress Ring ──

function ProgressRing({
  progress,
  color,
  size = 52,
  strokeWidth = 5,
}: {
  progress: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <Svg width={size} height={size}>
      {/* Track */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color + '20'}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

// ── Single Refill Item Card ──

function RefillItem({
  med,
  onPress,
}: {
  med: Medication;
  onPress?: () => void;
}) {
  const c = useColors();
  const { t } = useTranslation();
  const stock = med.refill?.currentStock ?? 0;
  const remindAt = med.refill?.refillAt ?? 5;
  // Estimate max as a reasonable refill amount, or use stock + remindAt * 3 for scale  
  const estimatedMax = Math.max(stock, remindAt * 4, 30);
  const progress = estimatedMax > 0 ? stock / estimatedMax : 0;
  const urgency = getUrgency(stock, remindAt);
  const urgencyColor = getUrgencyColor(urgency, c);

  return (
    <PressableScale onPress={onPress} style={styles.refillItemWrapper}>
        <View style={[styles.refillItem, { backgroundColor: c.card, ...shadows.sm }]}>
          {/* Left: progress ring with stock count */}
          <View style={styles.ringContainer}>
            <ProgressRing progress={progress} color={urgencyColor} size={52} strokeWidth={5} />
            <View style={styles.ringCenter}>
              <Text style={[styles.ringCount, { color: urgencyColor }]}>
                {stock}
              </Text>
            </View>
          </View>

          {/* Middle: med name + urgency */}
          <View style={styles.refillInfo}>
            <Text style={[styles.refillMedName, { color: c.textPrimary }]} numberOfLines={1}>
              {med.name}
            </Text>
            <View style={styles.urgencyRow}>
              <IconSymbol
                name={getUrgencyIcon(urgency) as any}
                size={13}
                color={urgencyColor}
              />
              <Text style={[styles.urgencyText, { color: urgencyColor }]}>
                {getUrgencyLabel(urgency, t)}
              </Text>
            </View>
            <Text style={[styles.refillSub, { color: c.textTertiary }]}>
              {med.dosage} {med.unit} · {t('refillTracker.remindAt', { count: remindAt })}
            </Text>
          </View>

          {/* Right: color dot */}
          <View style={[styles.medColorDot, { backgroundColor: med.color }]} />
        </View>
    </PressableScale>
  );
}

const RefillItemMemo = memo(RefillItem);

// ── Main Component ──

export function RefillTracker({ meds, onPressMed }: RefillTrackerProps) {
  const c = useColors();
  const { t } = useTranslation();
  const { isDark } = useAppTheme();

  const refillMeds = useMemo(
    () => meds.filter((m) => m.refill?.enabled && !m.paused),
    [meds],
  );

  const lowCount = useMemo(
    () =>
      refillMeds.filter((m) => {
        const stock = m.refill?.currentStock ?? 0;
        const remindAt = m.refill?.refillAt ?? 5;
        return stock <= remindAt;
      }).length,
    [refillMeds],
  );

  const emptyCount = useMemo(
    () => refillMeds.filter((m) => (m.refill?.currentStock ?? 0) <= 0).length,
    [refillMeds],
  );

  if (refillMeds.length === 0) return null;

  return (
      <View style={styles.container}>
        {/* ── Summary Header ── */}
        <View style={[styles.summaryCard, { backgroundColor: c.card, ...shadows.sm }]}>
          <LinearGradient
            colors={
              lowCount > 0
                ? isDark
                  ? ['rgba(255,59,48,0.12)', 'rgba(255,149,0,0.06)', 'transparent']
                  : ['rgba(255,59,48,0.08)', 'rgba(255,149,0,0.04)', 'transparent']
                : isDark
                  ? ['rgba(52,199,89,0.12)', 'rgba(52,199,89,0.04)', 'transparent']
                  : ['rgba(52,199,89,0.08)', 'rgba(52,199,89,0.03)', 'transparent']
            }
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          <View style={styles.summaryContent}>
            <View style={styles.summaryLeft}>
              <View style={[styles.summaryIconCircle, {
                backgroundColor: lowCount > 0 ? c.error + '15' : c.success + '15',
              }]}>
                <IconSymbol
                  name={lowCount > 0 ? 'exclamationmark.triangle.fill' : 'pill.circle.fill'}
                  size={22}
                  color={lowCount > 0 ? c.error : c.success}
                />
              </View>
              <View>
                <Text style={[styles.summaryTitle, { color: c.textPrimary }]}>
                  {t('refillTracker.title')}
                </Text>
                <Text style={[styles.summarySub, { color: c.textSecondary }]}>
                  {t('refillTracker.tracked', { count: refillMeds.length })}
                </Text>
              </View>
            </View>

            {/* Stats pills */}
            <View style={styles.summaryStats}>
              {lowCount > 0 && (
                <View style={[styles.statPill, { backgroundColor: c.error + '15' }]}>
                  <Text style={[styles.statPillText, { color: c.error }]}>
                    {t('refillTracker.low', { count: lowCount })}
                  </Text>
                </View>
              )}
              {emptyCount > 0 && (
                <View style={[styles.statPill, { backgroundColor: c.textTertiary + '20' }]}>
                  <Text style={[styles.statPillText, { color: c.textTertiary }]}>
                    {t('refillTracker.empty', { count: emptyCount })}
                  </Text>
                </View>
              )}
              {lowCount === 0 && emptyCount === 0 && (
                <View style={[styles.statPill, { backgroundColor: c.success + '15' }]}>
                  <Text style={[styles.statPillText, { color: c.success }]}>
                    {t('refillTracker.allStocked')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Per-medication refill cards ── */}
        {refillMeds.map((med) => (
          <RefillItemMemo
            key={med.id}
            med={med}
            onPress={() => onPressMed?.(med)}
          />
        ))}
      </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },

  // Summary card
  summaryCard: {
    borderRadius: radii.card,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  summaryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitle: {
    ...typography.sizes.headline,
    fontWeight: '700',
  },
  summarySub: {
    ...typography.sizes.caption1,
    marginTop: 1,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statPillText: {
    ...typography.sizes.caption1,
    fontWeight: '700',
  },

  // Refill item
  refillItemWrapper: {
    marginBottom: spacing.xs,
  },
  refillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.card,
    gap: spacing.sm,
  },
  ringContainer: {
    position: 'relative',
    width: 52,
    height: 52,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  refillInfo: {
    flex: 1,
  },
  refillMedName: {
    ...typography.sizes.subhead,
    fontWeight: '600',
    marginBottom: 2,
  },
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  urgencyText: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },
  refillSub: {
    ...typography.sizes.caption2,
  },
  medColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
