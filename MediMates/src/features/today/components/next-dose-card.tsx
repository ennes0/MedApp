/**
 * NextDoseCard — Hero card showing the next medication to take
 *
 * Three action buttons: Take (✓), Snooze (⏰), Skip (✕)
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useColors } from '@/src/design-system/theme-provider';
import { Card } from '@/src/design-system/components/card';
import { Button } from '@/src/design-system/components/button';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { formatTime } from '@/src/lib/utils';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { IMAGE_FOR_FORM } from '@/src/features/meds/types';
import type { ScheduledDose } from '@/src/types/firebase';
import { useTranslation } from 'react-i18next';

interface NextDoseCardProps {
  dose: ScheduledDose;
  onTake: () => void;
  onSnooze: () => void;
  onSkip: () => void;
}

export function NextDoseCard({ dose, onTake, onSnooze, onSkip }: NextDoseCardProps) {
  const c = useColors();
  const { t } = useTranslation();

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 18, stiffness: 200 }}
    >
      <Card variant="elevated" padding="lg" style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.label, { color: c.textSecondary }]}>
            {t('nextDose.label')}
          </Text>
          <View style={styles.timeRow}>
            <IconSymbol name="clock.fill" size={14} color={c.primary} />
            <Text style={[styles.time, { color: c.primary }]}>
              {formatTime(dose.scheduledTime)}
            </Text>
          </View>
        </View>

        {/* Med info */}
        <View style={styles.medInfo}>
          {dose.medForm && IMAGE_FOR_FORM[dose.medForm] ? (
            <View style={[styles.medIconWrap, { backgroundColor: `${dose.medColor}18` }]}>
              <Image
                source={IMAGE_FOR_FORM[dose.medForm]}
                style={styles.medFormImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View
              style={[
                styles.colorDot,
                { backgroundColor: dose.medColor },
              ]}
            />
          )}
          <View style={styles.medText}>
            <Text style={[styles.medName, { color: c.textPrimary }]}>
              {dose.medName}
            </Text>
            <Text style={[styles.dosage, { color: c.textSecondary }]}>
              {dose.dosage} {dose.unit}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={t('nextDose.take')}
            onPress={onTake}
            variant="primary"
            size="md"
            icon={<IconSymbol name="checkmark" size={16} color="#FFFFFF" />}
            style={styles.actionBtn}
          />
          <Button
            title={t('nextDose.snooze')}
            onPress={onSnooze}
            variant="secondary"
            size="md"
            icon={<IconSymbol name="clock.arrow.circlepath" size={16} color={c.primary} />}
            style={styles.actionBtn}
          />
          <Button
            title={t('nextDose.skip')}
            onPress={onSkip}
            variant="ghost"
            size="md"
            icon={<IconSymbol name="xmark" size={16} color={c.primary} />}
            style={styles.actionBtn}
          />
        </View>
      </Card>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.sizes.caption1,
    fontWeight: '600',
    letterSpacing: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    ...typography.sizes.footnote,
    fontWeight: '600',
    ...typography.tabularNums,
  },
  medInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm + 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  medIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medFormImage: {
    width: 28,
    height: 28,
  },
  medText: {
    flex: 1,
  },
  medName: {
    ...typography.sizes.title2,
    marginBottom: 2,
  },
  dosage: {
    ...typography.sizes.subhead,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
