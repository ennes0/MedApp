/**
 * ChatInput — Text input + send button for chat.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput as RNTextInput,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography, radii } from '@/src/design-system/tokens';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const c = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    Keyboard.dismiss();
  }, [text, onSend]);

  return (
    <View style={[styles.container, { borderTopColor: c.separator, backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={[styles.inputWrapper, { backgroundColor: c.surface, borderColor: c.separator }]}>
        <RNTextInput
          style={[styles.input, { color: c.textPrimary }]}
          placeholder={t('chat.messagePlaceholder')}
          placeholderTextColor={c.textTertiary}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={1000}
          editable={!disabled}
        />
      </View>

      <PressableScale
        onPress={handleSend}
        disabled={!text.trim() || disabled}
        style={[
          styles.sendBtn,
          {
            backgroundColor: text.trim() ? c.primary : c.separator,
          },
        ]}
      >
        <IconSymbol
          name="arrow.up"
          size={18}
          color={text.trim() ? '#FFFFFF' : c.textTertiary}
        />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    ...typography.sizes.body,
    minHeight: 20,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
});
