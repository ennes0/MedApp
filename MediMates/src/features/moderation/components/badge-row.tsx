/**
 * BadgeRow — Displays user badges in a horizontal scrollable row.
 * BadgeChip — Individual badge chip with icon and label.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BADGE_META, type BadgeType, type UserBadge } from '@/src/types/firebase';

// ──────────────────────────────────────────────
// Badge Chip
// ──────────────────────────────────────────────

interface BadgeChipProps {
  badge: UserBadge;
  size?: 'sm' | 'md';
}

export function BadgeChip({ badge, size = 'sm' }: BadgeChipProps) {
  const c = useColors();
  const meta = BADGE_META[badge.type];
  if (!meta) return null;

  const isSmall = size === 'sm';

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 14 }}
    >
      <View
        style={[
          styles.chip,
          isSmall ? styles.chipSm : styles.chipMd,
          { backgroundColor: meta.color + '18' },
        ]}
      >
        <IconSymbol
          name={meta.icon as any}
          size={isSmall ? 12 : 16}
          color={meta.color}
        />
        <Text
          style={[
            isSmall ? styles.chipTextSm : styles.chipTextMd,
            { color: meta.color },
          ]}
          numberOfLines={1}
        >
          {meta.labelTr}
        </Text>
      </View>
    </MotiView>
  );
}

// ──────────────────────────────────────────────
// Badge Row
// ──────────────────────────────────────────────

interface BadgeRowProps {
  badges: UserBadge[];
  size?: 'sm' | 'md';
  scrollable?: boolean;
}

export function BadgeRow({ badges, size = 'sm', scrollable = true }: BadgeRowProps) {
  if (!badges || badges.length === 0) return null;

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.badgeRow}
      >
        {badges.map((badge) => (
          <BadgeChip key={badge.type} badge={badge} size={size} />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.badgeRowWrap}>
      {badges.map((badge) => (
        <BadgeChip key={badge.type} badge={badge} size={size} />
      ))}
    </View>
  );
}

// ──────────────────────────────────────────────
// Member Since Label
// ──────────────────────────────────────────────

interface MemberSinceProps {
  memberSince: any; // Timestamp
}

export function MemberSinceLabel({ memberSince }: MemberSinceProps) {
  const c = useColors();

  const label = React.useMemo(() => {
    if (!memberSince?.toDate) return '';
    const date = memberSince.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return `Member for ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    if (diffDays < 30) return `Member for ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''}`;
    if (diffDays < 365) return `Member for ${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''}`;
    const years = Math.floor(diffDays / 365);
    return `Member for ${years} year${years !== 1 ? 's' : ''}`;
  }, [memberSince]);

  if (!label) return null;

  return (
    <View style={styles.memberSince}>
      <IconSymbol name="clock.fill" size={12} color={c.textTertiary} />
      <Text style={[styles.memberSinceText, { color: c.textTertiary }]}>
        {label}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────
// Mate Count Label
// ──────────────────────────────────────────────

interface MateCountProps {
  count: number;
}

export function MateCountLabel({ count }: MateCountProps) {
  const c = useColors();

  return (
    <View style={styles.mateCount}>
      <IconSymbol name="person.2.fill" size={12} color={c.textTertiary} />
      <Text style={[styles.mateCountText, { color: c.textTertiary }]}>
        {count} mate
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.full,
  },
  chipSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    gap: 3,
  },
  chipMd: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    gap: 5,
  },
  chipTextSm: {
    ...typography.sizes.caption2,
    fontWeight: '600',
  },
  chipTextMd: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: 2,
  },
  badgeRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  memberSince: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberSinceText: {
    ...typography.sizes.caption2,
  },
  mateCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mateCountText: {
    ...typography.sizes.caption2,
  },
});
