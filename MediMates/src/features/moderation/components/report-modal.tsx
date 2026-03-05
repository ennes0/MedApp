/**
 * ReportModal — Full-featured report dialog with reason selection.
 * BlockConfirmModal — Confirmation dialog for blocking a user.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button } from '@/src/design-system/components/button';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import type { ReportReason } from '@/src/types/firebase';

// ──────────────────────────────────────────────
// Report Reasons
// ──────────────────────────────────────────────

const REPORT_REASONS: { value: ReportReason; label: string; icon: string }[] = [
  { value: 'medical_advice',   label: 'Giving medical advice',        icon: 'cross.case.fill' },
  { value: 'dangerous_info',   label: 'Sharing dangerous information', icon: 'exclamationmark.triangle.fill' },
  { value: 'harassment',       label: 'Harassment / Bullying',        icon: 'hand.raised.fill' },
  { value: 'spam',             label: 'Spam / Advertising',           icon: 'envelope.badge.fill' },
  { value: 'inappropriate',    label: 'Inappropriate content',        icon: 'eye.slash.fill' },
  { value: 'fake_profile',     label: 'Fake profile',                 icon: 'person.crop.circle.badge.xmark' },
  { value: 'other',            label: 'Other',                        icon: 'ellipsis.circle.fill' },
];

// ──────────────────────────────────────────────
// Report Modal
// ──────────────────────────────────────────────

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, detail: string) => void;
  reportedName: string;
  isSubmitting?: boolean;
}

export function ReportModal({
  visible,
  onClose,
  onSubmit,
  reportedName,
  isSubmitting = false,
}: ReportModalProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');

  const handleSubmit = useCallback(() => {
    if (!selectedReason) return;
    onSubmit(selectedReason, detail.trim());
    // Reset
    setSelectedReason(null);
    setDetail('');
  }, [selectedReason, detail, onSubmit]);

  const handleClose = useCallback(() => {
    setSelectedReason(null);
    setDetail('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.background,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: c.separator }]} />
          </View>

          {/* Close */}
          <PressableScale onPress={handleClose} style={styles.closeBtn}>
            <View style={[styles.closeBtnCircle, { backgroundColor: c.surface }]}>
              <IconSymbol name="xmark" size={14} color={c.textSecondary} />
            </View>
          </PressableScale>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.headerIcon, { backgroundColor: '#FFEBEE' }]}>
                <IconSymbol name="exclamationmark.shield.fill" size={28} color="#FF3B30" />
              </View>
              <Text style={[styles.title, { color: c.textPrimary }]}>
                Report User
              </Text>
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                Why do you want to report <Text style={{ fontWeight: '600' }}>{reportedName}</Text>?
              </Text>
            </View>

            {/* Reasons */}
            {REPORT_REASONS.map((reason) => (
              <PressableScale
                key={reason.value}
                onPress={() => setSelectedReason(reason.value)}
                style={[
                  styles.reasonRow,
                  {
                    backgroundColor:
                      selectedReason === reason.value ? c.primaryLight ?? '#E5F0FF' : c.surface,
                    borderColor:
                      selectedReason === reason.value ? c.primary : 'transparent',
                  },
                ]}
              >
                <IconSymbol
                  name={reason.icon as any}
                  size={20}
                  color={selectedReason === reason.value ? c.primary : c.textSecondary}
                />
                <Text
                  style={[
                    styles.reasonText,
                    {
                      color:
                        selectedReason === reason.value ? c.primary : c.textPrimary,
                      fontWeight: selectedReason === reason.value ? '600' : '400',
                    },
                  ]}
                >
                  {reason.label}
                </Text>
                {selectedReason === reason.value && (
                  <IconSymbol name="checkmark.circle.fill" size={18} color={c.primary} />
                )}
              </PressableScale>
            ))}

            {/* Detail input */}
            {selectedReason && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel, { color: c.textSecondary }]}>
                  Additional details (optional)
                </Text>
                <TextInput
                  style={[
                    styles.detailInput,
                    { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.separator },
                  ]}
                  placeholder="Add details..."
                  placeholderTextColor={c.textTertiary}
                  value={detail}
                  onChangeText={setDetail}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Info */}
            <View style={[styles.infoBox, { backgroundColor: c.surface }]}>
              <IconSymbol name="info.circle.fill" size={14} color={c.textTertiary} />
              <Text style={[styles.infoText, { color: c.textTertiary }]}>
                Your report will be reviewed anonymously. Filing false reports violates community guidelines.
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Report"
              onPress={handleSubmit}
              size="lg"
              fullWidth
              disabled={!selectedReason || isSubmitting}
              style={{ backgroundColor: '#FF3B30' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Block Confirmation
// ──────────────────────────────────────────────

interface BlockConfirmProps {
  userName: string;
  onBlock: () => void;
  onCancel: () => void;
}

export function showBlockConfirm({ userName, onBlock, onCancel }: BlockConfirmProps) {
  Alert.alert(
    'Block User',
    `Are you sure you want to block ${userName}?\n\nBlocked user:\n• Cannot send you messages\n• Won't appear in your profile list\n• Will be removed from your matches`,
    [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      {
        text: 'Block',
        style: 'destructive',
        onPress: onBlock,
      },
    ],
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
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
    paddingBottom: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.sizes.title3,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.sizes.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
    borderWidth: 1.5,
  },
  reasonText: {
    ...typography.sizes.callout,
    flex: 1,
  },
  detailSection: {
    marginTop: spacing.md,
  },
  detailLabel: {
    ...typography.sizes.caption1,
    marginBottom: spacing.xs,
  },
  detailInput: {
    ...typography.sizes.body,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 80,
    maxHeight: 150,
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  infoText: {
    ...typography.sizes.caption2,
    lineHeight: 16,
    flex: 1,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
