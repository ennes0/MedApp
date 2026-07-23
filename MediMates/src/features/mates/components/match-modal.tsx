/**
 * MatchModal — shown when a mutual match is detected.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { MotiView } from 'moti';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';
import { Avatar } from '@/src/design-system/components/avatar';
import { Button } from '@/src/design-system/components/button';
import { useTranslation } from 'react-i18next';

interface MatchModalProps {
  visible: boolean;
  matchName: string;
  matchAvatar: string | null;
  onSendMessage: () => void;
  onClose: () => void;
}

export function MatchModal({
  visible,
  matchName,
  matchAvatar,
  onSendMessage,
  onClose,
}: MatchModalProps) {
  const c = useColors();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <MotiView
          from={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 120 }}
          style={[styles.card, { backgroundColor: c.card }]}
        >
          <Text style={[styles.emoji]}>🎉</Text>
          <Text style={[styles.title, { color: c.textPrimary }]}>{t('matesMatch.itsAMatch')}</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {t('matesMatch.subtitle', { name: matchName })}
          </Text>

          <Avatar name={matchName} imageUrl={matchAvatar} size="lg" />

          <View style={styles.buttons}>
            <Button
              label={t('matesMatch.sendMessage')}
              onPress={onSendMessage}
              style={styles.btn}
            />
            <Button
              label={t('matesMatch.keepSwiping')}
              variant="ghost"
              onPress={onClose}
              style={styles.btn}
            />
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: radii.sheet,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.sizes.title1,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.sizes.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  buttons: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  btn: {
    width: '100%',
  },
});
