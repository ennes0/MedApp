/**
 * MateProfileSheet — Bottom sheet showing matched mate's profile details.
 * Uses native slide animation for smooth performance.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii, shadows } from '@/src/design-system/tokens';
import { Avatar } from '@/src/design-system/components/avatar';
import { Button } from '@/src/design-system/components/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableScale } from '@/src/design-system/components/pressable-scale';

interface MateProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  onSendMessage: () => void;
  mate: {
    uid: string;
    displayName: string;
    photoURL: string | null;
    bio: string;
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
  const insets = useSafeAreaInsets();

  if (!mate) return null;

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
            {/* Avatar + Name */}
            <View style={styles.profileSection}>
              <Avatar
                uri={mate.photoURL}
                name={mate.displayName}
                size="lg"
              />
              <Text style={[styles.name, { color: c.textPrimary }]}>
                {mate.displayName}
              </Text>
              {mate.bio ? (
                <Text style={[styles.bio, { color: c.textSecondary }]}>
                  {mate.bio}
                </Text>
              ) : null}
            </View>

            {/* Shared Med Badge */}
            <View style={styles.sharedMedSection}>
              <View style={[styles.sharedMedCard, { backgroundColor: medColor + '12' }]}>
                <IconSymbol name="pill.fill" size={20} color={medColor} />
                <View style={styles.sharedMedInfo}>
                  <Text style={[styles.sharedMedLabel, { color: c.textSecondary }]}>
                    Shared Medication
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
                  Verified MediMates user
                </Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: c.surface }]}>
                <IconSymbol name="hand.raised.fill" size={20} color={c.warning} />
                <Text style={[styles.infoText, { color: c.textSecondary }]}>
                  All chats are private & encrypted
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              title="Send Message"
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
    marginBottom: spacing.lg,
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
  actions: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
});
