/**
 * MedicalDisclaimer — Persistent banner shown at the top of chat.
 * ChatConsentModal — One-time consent before first chat.
 * CommunityGuidelinesSheet — Full community guidelines.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button } from '@/src/design-system/components/button';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import {
  MEDICAL_DISCLAIMERS,
  COMMUNITY_GUIDELINES_TR,
} from '@/src/features/moderation/content-filter';

// ──────────────────────────────────────────────
// Chat Disclaimer Banner
// ──────────────────────────────────────────────

interface DisclaimerBannerProps {
  onDismiss?: () => void;
  compact?: boolean;
}

export function DisclaimerBanner({ onDismiss, compact = false }: DisclaimerBannerProps) {
  const c = useColors();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: -10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
    >
      <View style={[styles.banner, { backgroundColor: c.warningLight ?? '#FFF3CD' }]}>
        <View style={styles.bannerContent}>
          <IconSymbol name="exclamationmark.triangle.fill" size={18} color={c.warning ?? '#FF9F0A'} />
          <Text
            style={[
              compact ? styles.bannerTextCompact : styles.bannerText,
              { color: c.textPrimary },
            ]}
          >
            {compact
              ? '⚕️ Experience sharing only, not medical advice.'
              : MEDICAL_DISCLAIMERS.chatBanner.en}
          </Text>
        </View>
        {onDismiss && (
          <PressableScale
            onPress={() => {
              setDismissed(true);
              onDismiss?.();
            }}
            style={styles.dismissBtn}
          >
            <IconSymbol name="xmark" size={12} color={c.textTertiary} />
          </PressableScale>
        )}
      </View>
    </MotiView>
  );
}

// ──────────────────────────────────────────────
// Chat Consent Modal (one-time before first chat)
// ──────────────────────────────────────────────

interface ChatConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function ChatConsentModal({ visible, onAccept, onDecline }: ChatConsentModalProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View
          style={[
            styles.consentCard,
            {
              backgroundColor: c.background,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false} style={styles.consentScroll}>
            {/* Header */}
            <View style={styles.consentHeader}>
              <View style={[styles.consentIconCircle, { backgroundColor: c.warningLight ?? '#FFF3CD' }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={32} color={c.warning ?? '#FF9F0A'} />
              </View>
              <Text style={[styles.consentTitle, { color: c.textPrimary }]}>
                Important Warning
              </Text>
              <Text style={[styles.consentSubtitle, { color: c.textSecondary }]}>
                Please read before starting a chat
              </Text>
            </View>

            {/* Disclaimer text */}
            <View style={[styles.consentBox, { backgroundColor: c.surface }]}>
              <Text style={[styles.consentText, { color: c.textPrimary }]}>
                {MEDICAL_DISCLAIMERS.consentPrompt.en}
              </Text>
            </View>

            {/* Community Guidelines */}
            <Text style={[styles.guidelinesTitle, { color: c.textPrimary }]}>
              Community Guidelines
            </Text>
            {COMMUNITY_GUIDELINES_TR.map((rule, i) => (
              <View key={i} style={styles.guidelineRow}>
                <View style={[styles.guidelineIcon, { backgroundColor: c.primaryLight ?? '#E5F0FF' }]}>
                  <IconSymbol name={rule.icon as any} size={16} color={c.primary} />
                </View>
                <View style={styles.guidelineTextCol}>
                  <Text style={[styles.guidelineRuleTitle, { color: c.textPrimary }]}>
                    {rule.title}
                  </Text>
                  <Text style={[styles.guidelineRuleDesc, { color: c.textSecondary }]}>
                    {rule.description}
                  </Text>
                </View>
              </View>
            ))}

            {/* Legal */}
            <View style={[styles.legalBox, { borderColor: c.separator }]}>
              <Text style={[styles.legalText, { color: c.textTertiary }]}>
                {MEDICAL_DISCLAIMERS.legalFooter.en}
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.consentActions}>
            <Button
              title="I Accept and Continue"
              onPress={onAccept}
              size="lg"
              fullWidth
            />
            <Pressable onPress={onDecline} style={styles.declineBtn}>
              <Text style={[styles.declineText, { color: c.textTertiary }]}>
                Go Back
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Content Warning Toast (inline)
// ──────────────────────────────────────────────

interface ContentWarningProps {
  message: string;
  onDismiss: () => void;
}

export function ContentWarningToast({ message, onDismiss }: ContentWarningProps) {
  const c = useColors();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: 10 }}
      transition={{ type: 'spring', damping: 14 }}
    >
      <View style={[styles.warningToast, { backgroundColor: '#FFF3CD', borderColor: '#FFE082' }]}>
        <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#FF9F0A" />
        <Text style={[styles.warningToastText, { color: '#664D03' }]}>
          {message}
        </Text>
        <PressableScale onPress={onDismiss} style={styles.warningDismiss}>
          <IconSymbol name="xmark" size={10} color="#664D03" />
        </PressableScale>
      </View>
    </MotiView>
  );
}

// ──────────────────────────────────────────────
// Discover Warning Banner
// ──────────────────────────────────────────────

export function DiscoverDisclaimerBanner() {
  const c = useColors();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: -8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 250 }}
    >
      <View style={[styles.discoverBanner, { backgroundColor: c.surface }]}>
        <View style={styles.discoverBannerRow}>
          <IconSymbol name="info.circle.fill" size={16} color={c.primary} />
          <Text style={[styles.discoverBannerText, { color: c.textSecondary }]}>
            {MEDICAL_DISCLAIMERS.discoverWarning.en}
          </Text>
        </View>
        <PressableScale onPress={() => setDismissed(true)} style={styles.dismissBtn}>
          <IconSymbol name="xmark" size={11} color={c.textTertiary} />
        </PressableScale>
      </View>
    </MotiView>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  bannerText: {
    ...typography.sizes.caption1,
    lineHeight: 18,
    flex: 1,
  },
  bannerTextCompact: {
    ...typography.sizes.caption2,
    lineHeight: 16,
    flex: 1,
  },
  dismissBtn: {
    padding: 4,
    marginLeft: spacing.xs,
  },

  // Consent Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  consentCard: {
    maxHeight: '90%',
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingTop: spacing.lg,
  },
  consentScroll: {
    paddingHorizontal: spacing.lg,
  },
  consentHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  consentIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  consentTitle: {
    ...typography.sizes.title2,
    fontWeight: '700',
    marginBottom: 4,
  },
  consentSubtitle: {
    ...typography.sizes.body,
    textAlign: 'center',
  },
  consentBox: {
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  consentText: {
    ...typography.sizes.footnote,
    lineHeight: 22,
  },
  guidelinesTitle: {
    ...typography.sizes.headline,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  guidelineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  guidelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  guidelineTextCol: {
    flex: 1,
  },
  guidelineRuleTitle: {
    ...typography.sizes.callout,
    fontWeight: '600',
    marginBottom: 2,
  },
  guidelineRuleDesc: {
    ...typography.sizes.caption1,
    lineHeight: 18,
  },
  legalBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  legalText: {
    ...typography.sizes.caption2,
    lineHeight: 16,
    textAlign: 'center',
  },
  consentActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  declineBtn: {
    paddingVertical: spacing.sm,
  },
  declineText: {
    ...typography.sizes.callout,
  },

  // Content Warning
  warningToast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  warningToastText: {
    ...typography.sizes.caption2,
    lineHeight: 16,
    flex: 1,
  },
  warningDismiss: {
    padding: 2,
  },

  // Discover Banner
  discoverBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  discoverBannerRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  discoverBannerText: {
    ...typography.sizes.caption1,
    lineHeight: 18,
    flex: 1,
  },
});
