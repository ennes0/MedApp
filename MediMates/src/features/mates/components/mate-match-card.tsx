/**
 * MateMatchCard — Shows a medication with its matched mate.
 *
 * States:
 * 1. No match yet → "Find Mate" button with pill animation
 * 2. Searching → Animated searching indicator
 * 3. Matched → Mate profile card with chat shortcut
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Avatar } from '@/src/design-system/components/avatar';
import { Button } from '@/src/design-system/components/button';
import { Chip } from '@/src/design-system/components/chip';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ICON_FOR_FORM } from '@/src/features/meds/types';
import type { MedWithMatch } from '@/src/features/mates/hooks/use-med-matching';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const medColor = med.color || c.primary;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20, scale: 0.95 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 18, stiffness: 120, delay: index * 100 }}
    >
      <View style={[styles.card, { backgroundColor: c.card, ...shadows.md }]}>
        {/* Med Header */}
        <View style={styles.medHeader}>
          <View style={[styles.medIconContainer, { backgroundColor: medColor + '20' }]}>
            <IconSymbol name={medIcon as any} size={22} color={medColor} />
          </View>
          <View style={styles.medInfo}>
            <Text style={[styles.medName, { color: c.textPrimary }]} numberOfLines={1}>
              {med.name}
            </Text>
            <Text style={[styles.medDosage, { color: c.textSecondary }]}>
              {med.dosage} {med.unit}
              {med.form ? ` · ${med.form}` : ''}
            </Text>
          </View>
          {match && (
            <View style={[styles.matchBadge, { backgroundColor: c.success + '18' }]}>
              <IconSymbol name="checkmark.circle.fill" size={14} color={c.success} />
              <Text style={[styles.matchBadgeText, { color: c.success }]}>Matched</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: c.separator }]} />

        {/* Content Area */}
        {match && mateProfile ? (
          <MatchedContent
            mateProfile={mateProfile}
            medColor={medColor}
            onOpenChat={onOpenChat}
            onViewProfile={onViewProfile}
          />
        ) : isSearching ? (
          <SearchingContent medColor={medColor} />
        ) : (
          <NoMatchContent medColor={medColor} onFindMate={onFindMate} />
        )}
      </View>
    </MotiView>
  );
}

// ──────────────────────────────────────────────
// Matched state — show mate profile
// ──────────────────────────────────────────────

function MatchedContent({
  mateProfile,
  medColor,
  onOpenChat,
  onViewProfile,
}: {
  mateProfile: { uid: string; displayName: string; photoURL: string | null; bio: string };
  medColor: string;
  onOpenChat: () => void;
  onViewProfile: () => void;
}) {
  const c = useColors();

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 14, stiffness: 100 }}
    >
      <PressableScale onPress={onViewProfile}>
        <View style={styles.mateRow}>
          <Avatar
            uri={mateProfile.photoURL}
            name={mateProfile.displayName}
            size="md"
          />
          <View style={styles.mateInfo}>
            <Text style={[styles.mateName, { color: c.textPrimary }]}>
              {mateProfile.displayName}
            </Text>
            {mateProfile.bio ? (
              <Text
                style={[styles.mateBio, { color: c.textSecondary }]}
                numberOfLines={1}
              >
                {mateProfile.bio}
              </Text>
            ) : (
              <Text style={[styles.mateBio, { color: c.textTertiary }]}>
                Your med mate 💊
              </Text>
            )}
          </View>
          <IconSymbol name="chevron.right" size={16} color={c.textTertiary} />
        </View>
      </PressableScale>

      <Button
        title="Send Message"
        onPress={onOpenChat}
        size="sm"
        style={[styles.chatButton, { backgroundColor: medColor }]}
        icon={
          <IconSymbol name="bubble.left.fill" size={14} color="#FFFFFF" />
        }
      />
    </MotiView>
  );
}

// ──────────────────────────────────────────────
// Searching state — animation
// ──────────────────────────────────────────────

function SearchingContent({ medColor }: { medColor: string }) {
  const c = useColors();

  return (
    <View style={styles.searchingContainer}>
      <View style={styles.searchingDots}>
        {[0, 1, 2].map((i) => (
          <MotiView
            key={i}
            from={{ opacity: 0.3, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'timing',
              duration: 600,
              delay: i * 200,
              loop: true,
            }}
            style={[styles.dot, { backgroundColor: medColor }]}
          />
        ))}
      </View>
      <Text style={[styles.searchingText, { color: c.textSecondary }]}>
        Finding your mate...
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────
// No match state — find mate button
// ──────────────────────────────────────────────

function NoMatchContent({
  medColor,
  onFindMate,
}: {
  medColor: string;
  onFindMate: () => void;
}) {
  const c = useColors();

  return (
    <View style={styles.noMatchContainer}>
      <MotiView
        from={{ rotate: '-5deg', scale: 0.95 }}
        animate={{ rotate: '0deg', scale: 1 }}
        transition={{ type: 'spring', damping: 10, stiffness: 80 }}
      >
        <View style={[styles.noMatchIcon, { backgroundColor: c.primaryLight }]}>
          <IconSymbol name="person.badge.plus" size={28} color={c.primary} />
        </View>
      </MotiView>
      <Text style={[styles.noMatchText, { color: c.textSecondary }]}>
        Find someone who takes the same medication
      </Text>
      <Button
        title="Find My Mate"
        onPress={onFindMate}
        size="md"
        style={{ backgroundColor: medColor }}
        icon={
          <IconSymbol name="sparkles" size={16} color="#FFFFFF" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  medIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    ...typography.sizes.headline,
    fontWeight: '600',
  },
  medDosage: {
    ...typography.sizes.caption1,
    marginTop: 1,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    gap: 4,
  },
  matchBadgeText: {
    ...typography.sizes.caption2,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
  },
  // Matched
  mateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  mateInfo: {
    flex: 1,
  },
  mateName: {
    ...typography.sizes.callout,
    fontWeight: '600',
  },
  mateBio: {
    ...typography.sizes.caption1,
    marginTop: 1,
  },
  chatButton: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  // Searching
  searchingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  searchingDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  searchingText: {
    ...typography.sizes.footnote,
  },
  // No match
  noMatchContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  noMatchIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  noMatchText: {
    ...typography.sizes.footnote,
    textAlign: 'center',
    maxWidth: 240,
    marginBottom: spacing.xs,
  },
});
