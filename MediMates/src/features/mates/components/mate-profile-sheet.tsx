/**
 * MateProfileSheet — Bottom sheet showing matched mate's profile details.
 *
 * Enhanced with:
 * - Nickname (takma ad) display
 * - Badge system (rozet sistemi)
 * - Mate count
 * - Member since label
 * - Medical disclaimer
 * - Report & Block actions
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Avatar } from '@/src/design-system/components/avatar';
import { Button } from '@/src/design-system/components/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import {
  BadgeRow,
  MemberSinceLabel,
  MateCountLabel,
  ReportModal,
  showBlockConfirm,
  useReportUser,
  useBlockUser,
  MEDICAL_DISCLAIMERS,
} from '@/src/features/moderation';
import { useMateFullProfile } from '@/src/features/mates/hooks/use-med-matching';
import { useUIStore } from '@/src/stores/ui-store';
import type { UserBadge, ReportReason } from '@/src/types/firebase';
import type { Timestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

interface MateProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  onSendMessage: () => void;
  mate: {
    uid: string;
    displayName: string;
    nickname?: string;
    photoURL: string | null;
    bio: string;
    badges?: UserBadge[];
    mateCount?: number;
    memberSince?: Timestamp;
  } | null;
  sharedMedName: string;
  medColor: string;
}

export function MateProfileSheet({
  visible,
  onClose,
  onSendMessage,
  mate,
  sharedMedName,
  medColor,
}: MateProfileSheetProps) {
  const c = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const showToast = useUIStore((s) => s.showToast);
  const reportUser = useReportUser();
  const blockUser = useBlockUser();
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Fetch full profile from Firestore (badges, mateCount, memberSince, nickname)
  const { data: fullProfile, isLoading: profileLoading } = useMateFullProfile(
    visible ? mate?.uid : undefined,
  );

  // Merge: prefer full profile data, fallback to prop data
  const mergedMate = mate
    ? {
        ...mate,
        nickname: fullProfile?.nickname || mate.nickname,
        badges: fullProfile?.badges ?? mate.badges,
        mateCount: fullProfile?.mateCount ?? mate.mateCount,
        memberSince: fullProfile?.memberSince ?? mate.memberSince,
        bio: fullProfile?.bio || mate.bio,
      }
    : null;

  const handleReportSubmit = useCallback(
    (reason: ReportReason, detail: string) => {
      if (!mate) return;
      reportUser.mutate(
        { reportedUid: mate.uid, reason, reasonDetail: detail },
        {
          onSuccess: () => {
            setReportModalVisible(false);
            showToast({ type: 'info', title: t('mateProfile.reportSent') });
          },
          onError: () => {
            showToast({ type: 'error', title: t('mateProfile.reportFailed') });
          },
        },
      );
    },
    [mate, reportUser, showToast, t],
  );

  const handleBlock = useCallback(() => {
    if (!mate) return;
    showBlockConfirm({
      userName: mate.nickname || mate.displayName,
      onBlock: () => {
        blockUser.mutate(mate.uid, {
          onSuccess: () => {
            showToast({ type: 'info', title: t('mateProfile.blocked', { name: mate.nickname || mate.displayName }) });
            onClose();
          },
          onError: () => {
            showToast({ type: 'error', title: t('mateProfile.blockFailed') });
          },
        });
      },
      onCancel: () => {},
    });
  }, [mate, blockUser, showToast, onClose, t]);

  if (!mate) return null;

  const m = mergedMate!;
  const displayName = m.nickname || m.displayName;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.background,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: c.separator }]} />
          </View>

          {/* Close button */}
          <PressableScale onPress={onClose} style={styles.closeBtn}>
            <View style={[styles.closeBtnCircle, { backgroundColor: c.surface }]}>
              <IconSymbol name="xmark" size={14} color={c.textSecondary} />
            </View>
          </PressableScale>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar + Nickname */}
            <View style={styles.profileSection}>
              <Avatar
                uri={m.photoURL}
                name={displayName}
                size="lg"
              />
              <Text style={[styles.name, { color: c.textPrimary }]}>
                {displayName}
              </Text>
              {m.bio ? (
                <Text style={[styles.bio, { color: c.textSecondary }]}>
                  {m.bio}
                </Text>
              ) : null}

              {/* Meta row: member since + mate count */}
              <View style={styles.metaRow}>
                {profileLoading ? (
                  <ActivityIndicator size="small" color={c.textTertiary} />
                ) : (
                  <>
                    {m.memberSince && (
                      <MemberSinceLabel memberSince={m.memberSince} />
                    )}
                    {typeof m.mateCount === 'number' && (
                      <MateCountLabel count={m.mateCount} />
                    )}
                  </>
                )}
              </View>
            </View>

            {/* Badges (Rozet Sistemi) */}
            {m.badges && m.badges.length > 0 && (
              <View style={styles.badgeSection}>
                <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
                  {t('mateProfile.badges')}
                </Text>
                <BadgeRow badges={m.badges} size="md" scrollable={false} />
              </View>
            )}

            {/* Shared Med Badge */}
            <View style={styles.sharedMedSection}>
              <View style={[styles.sharedMedCard, { backgroundColor: medColor + '12' }]}>
                <IconSymbol name="pill.fill" size={20} color={medColor} />
                <View style={styles.sharedMedInfo}>
                  <Text style={[styles.sharedMedLabel, { color: c.textSecondary }]}>
                    {t('mateProfile.sharedMedication')}
                  </Text>
                  <Text style={[styles.sharedMedName, { color: medColor }]}>
                    {sharedMedName}
                  </Text>
                </View>
              </View>
            </View>

            {/* Info Cards */}
            <View style={styles.infoSection}>
              <View style={[styles.infoCard, { backgroundColor: c.surface }]}>
                <IconSymbol name="shield.checkered" size={20} color={c.primary} />
                <Text style={[styles.infoText, { color: c.textSecondary }]}>
                  {t('mateProfile.verifiedUser')}
                </Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: c.surface }]}>
                <IconSymbol name="hand.raised.fill" size={20} color={c.warning} />
                <Text style={[styles.infoText, { color: c.textSecondary }]}>
                  {t('mateProfile.privateChats')}
                </Text>
              </View>
            </View>

            {/* Medical Disclaimer */}
            <View style={[styles.disclaimerBox, { backgroundColor: c.warningLight ?? '#FFF3CD' }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color={c.warning ?? '#FF9F0A'} />
              <Text style={[styles.disclaimerText, { color: c.textSecondary }]}>
                {MEDICAL_DISCLAIMERS.profileWarning.en}
              </Text>
            </View>

            {/* Report & Block */}
            <View style={styles.moderationSection}>
              <PressableScale
                onPress={() => setReportModalVisible(true)}
                style={[styles.moderationBtn, { backgroundColor: c.surface }]}
              >
                <IconSymbol name="exclamationmark.shield.fill" size={16} color="#FF3B30" />
                <Text style={[styles.moderationBtnText, { color: '#FF3B30' }]}>
                  {t('mateProfile.reportUser')}
                </Text>
              </PressableScale>
              <PressableScale
                onPress={handleBlock}
                style={[styles.moderationBtn, { backgroundColor: c.surface }]}
              >
                <IconSymbol name="hand.raised.fill" size={16} color={c.textTertiary} />
                <Text style={[styles.moderationBtnText, { color: c.textTertiary }]}>
                  {t('mateProfile.block')}
                </Text>
              </PressableScale>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              title={t('mateProfile.sendMessage')}
              onPress={onSendMessage}
              size="lg"
              fullWidth
              style={{ backgroundColor: medColor }}
              icon={
                <IconSymbol name="bubble.left.fill" size={18} color="#FFFFFF" />
              }
            />
          </View>
        </View>
      </View>

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        reportedName={displayName}
        isSubmitting={reportUser.isPending}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    maxHeight: '85%',
    ...shadows.lg,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    zIndex: 10,
  },
  closeBtnCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  name: {
    ...typography.sizes.title2,
    marginTop: spacing.md,
  },
  bio: {
    ...typography.sizes.body,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  badgeSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.sizes.caption1,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  sharedMedSection: {
    marginBottom: spacing.lg,
  },
  sharedMedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.card,
    gap: spacing.sm,
  },
  sharedMedInfo: {
    flex: 1,
  },
  sharedMedLabel: {
    ...typography.sizes.caption1,
  },
  sharedMedName: {
    ...typography.sizes.headline,
    fontWeight: '600',
    marginTop: 1,
  },
  infoSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.card,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.sizes.footnote,
    flex: 1,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  disclaimerText: {
    ...typography.sizes.caption2,
    lineHeight: 16,
    flex: 1,
  },
  moderationSection: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  moderationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  moderationBtnText: {
    ...typography.sizes.caption1,
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
});
