/**
 * MateMatchCard — Business-card-style medication + mate card
 *
 * Inspired by modern business/profile card design:
 * - Rounded card with subtle shadow
 * - Top area: med info (left) · avatar (center) · match count/status (right)
 * - Center: mate name (large bold) + subtitle
 * - Bottom: action chips (Your Links style)
 *
 * Three states: no match, searching, matched.
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Avatar } from '@/src/design-system/components/avatar';
import { Button } from '@/src/design-system/components/button';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ICON_FOR_FORM, IMAGE_FOR_FORM } from '@/src/features/meds/types';
import type { MedWithMatch } from '@/src/features/mates/hooks/use-med-matching';

interface MateMatchCardProps {
  item: MedWithMatch;
  index: number;
  onFindMate: () => void;
  onOpenChat: () => void;
  onViewProfile: () => void;
  isSearching: boolean;
}

export function MateMatchCard({
  item,
  index,
  onFindMate,
  onOpenChat,
  onViewProfile,
  isSearching,
}: MateMatchCardProps) {
  const c = useColors();
  const { med, match, mateProfile } = item;

  const medIcon = ICON_FOR_FORM[med.form ?? 'tablet'] ?? 'pill.fill';
  const medFormImage = IMAGE_FOR_FORM[med.form ?? 'tablet'];
  const medColor = med.color || c.primary;

  return (
    <View style={[styles.card, { backgroundColor: c.card, ...shadows.md }]}>
      {/* ── Top Row: Med info (left) · Avatar (center) · Status (right) ── */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <View style={[styles.medPill, { backgroundColor: medColor + '14' }]}>
            {medFormImage ? (
              <Image source={medFormImage} style={styles.medFormImage} resizeMode="contain" />
            ) : (
              <IconSymbol name={medIcon as any} size={16} color={medColor} />
            )}
            <Text style={[styles.medPillText, { color: medColor }]} numberOfLines={1}>
              {med.name}
            </Text>
          </View>
          <Text style={[styles.medDosage, { color: c.textTertiary }]}>
            {med.dosage} {med.unit}{med.form ? ` · ${med.form}` : ''}
          </Text>
        </View>

        {match && mateProfile ? (
          <PressableScale onPress={onViewProfile} style={styles.avatarContainer}>
            <View style={[styles.avatarRing, { borderColor: medColor }]}>
              <Avatar
                uri={mateProfile.photoURL}
                name={mateProfile.displayName}
                size="md"
              />
            </View>
          </PressableScale>
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: c.surface }]}>
            <IconSymbol name="person.fill" size={24} color={c.textTertiary} />
          </View>
        )}

        <View style={styles.topRight}>
          {match ? (
            <View style={[styles.statusChip, { backgroundColor: c.successLight }]}>
              <IconSymbol name="checkmark.circle.fill" size={14} color={c.success} />
              <Text style={[styles.statusChipText, { color: c.success }]}>Matched</Text>
            </View>
          ) : (
            <View style={[styles.statusChip, { backgroundColor: c.surface }]}>
              <IconSymbol name="person.badge.plus" size={14} color={c.textTertiary} />
              <Text style={[styles.statusChipText, { color: c.textTertiary }]}>Open</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Center: Name & subtitle ── */}
      {match && mateProfile ? (
        <PressableScale onPress={onViewProfile}>
          <Text style={[styles.mateName, { color: c.textPrimary }]} numberOfLines={1}>
            {mateProfile.displayName}
          </Text>
          <Text style={[styles.mateBio, { color: c.textSecondary }]} numberOfLines={1}>
            {mateProfile.bio || `Your ${med.name} mate 💊`}
          </Text>
        </PressableScale>
      ) : isSearching ? (
        <View style={styles.centerPlaceholder}>
          <Text style={[styles.mateName, { color: c.textPrimary }]}>Searching...</Text>
          <Text style={[styles.mateBio, { color: c.textSecondary }]}>
            Finding someone who takes {med.name}
          </Text>
          <View style={styles.searchingDots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, { backgroundColor: medColor, opacity: 0.4 + i * 0.2 }]} />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.centerPlaceholder}>
          <Text style={[styles.mateName, { color: c.textSecondary }]}>No mate yet</Text>
          <Text style={[styles.mateBio, { color: c.textTertiary }]}>
            Find someone who takes the same medication
          </Text>
        </View>
      )}

      {/* ── Divider ── */}
      <View style={[styles.divider, { backgroundColor: c.separator }]} />

      {/* ── Bottom: Action row ── */}
      <View style={styles.bottomRow}>
        {match && mateProfile ? (
          <>
            <PressableScale onPress={onViewProfile} style={styles.bottomAction}>
              <IconSymbol name="person.circle" size={16} color={c.textSecondary} />
              <Text style={[styles.bottomActionText, { color: c.textSecondary }]}>Profile</Text>
            </PressableScale>

            <View style={[styles.bottomDivider, { backgroundColor: c.separator }]} />

            <PressableScale onPress={onOpenChat} style={styles.bottomActionPrimary}>
              <IconSymbol name="bubble.left.fill" size={16} color={medColor} />
              <Text style={[styles.bottomActionTextPrimary, { color: medColor }]}>
                Message
              </Text>
            </PressableScale>
          </>
        ) : !isSearching ? (
          <View style={styles.findMateRow}>
            <Button
              title="Find My Mate"
              onPress={onFindMate}
              size="md"
              fullWidth
              style={{ backgroundColor: medColor }}
              icon={
                <IconSymbol name="sparkles" size={16} color="#FFFFFF" />
              }
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md + 4,
    borderRadius: radii.lg + 4,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },

  // ── Top row ──
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  topLeft: {
    flex: 1,
    gap: 4,
  },
  medPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 5,
  },
  medFormImage: {
    width: 16,
    height: 16,
  },
  medPillText: {
    ...typography.sizes.caption1,
    fontWeight: '700',
    maxWidth: 100,
  },
  medDosage: {
    ...typography.sizes.caption2,
    marginLeft: 2,
  },
  topRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 4,
  },
  statusChipText: {
    ...typography.sizes.caption1,
    fontWeight: '700',
  },

  // ── Avatar ──
  avatarContainer: {
    alignItems: 'center',
  },
  avatarRing: {
    borderWidth: 2.5,
    borderRadius: 999,
    padding: 2,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Center ──
  mateName: {
    ...typography.sizes.title2,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
  },
  mateBio: {
    ...typography.sizes.subhead,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  centerPlaceholder: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  // ── Divider ──
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },

  // ── Bottom row ──
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  bottomAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  bottomActionText: {
    ...typography.sizes.callout,
    fontWeight: '600',
  },
  bottomDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  bottomActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  bottomActionTextPrimary: {
    ...typography.sizes.callout,
    fontWeight: '700',
  },
  findMateRow: {
    flex: 1,
  },

  // ── Searching dots ──
  searchingDots: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
