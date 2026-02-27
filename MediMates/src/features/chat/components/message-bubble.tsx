/**
 * MessageBubble — Chat message bubble component.
 *
 * iMessage-style bubbles with read receipts, tail, and entrance animation.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography } from '@/src/design-system/tokens';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { MessageDoc } from '@/src/types/firebase';

interface MessageBubbleProps {
  message: MessageDoc;
  isMine: boolean;
  index: number;
  showAvatar?: boolean;
  accentColor?: string;
}

export function MessageBubble({
  message,
  isMine,
  index,
  showAvatar = false,
  accentColor,
}: MessageBubbleProps) {
  const c = useColors();
  const bubbleColor = isMine ? (accentColor ?? c.primary) : c.card;

  const timeStr = useMemo(() => {
    if (!message.createdAt?.toDate) return '';
    return message.createdAt.toDate().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [message.createdAt]);

  // Limit animation delay to avoid slow initial render
  const animDelay = Math.min(index * 25, 200);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 180, delay: animDelay }}
      style={[
        styles.container,
        isMine ? styles.mine : styles.theirs,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isMine
            ? [styles.myBubble, { backgroundColor: bubbleColor }]
            : [styles.theirBubble, { backgroundColor: bubbleColor }],
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isMine ? '#FFFFFF' : c.textPrimary },
          ]}
          selectable
        >
          {message.text}
        </Text>
      </View>

      {/* Time + read receipt */}
      <View style={styles.metaRow}>
        <Text style={[styles.time, { color: c.textTertiary }]}>{timeStr}</Text>
        {isMine && message.readBy && message.readBy.length > 1 && (
          <IconSymbol name="checkmark" size={10} color={c.primary} />
        )}
      </View>
    </MotiView>
  );
}

/** Date separator between messages from different days */
export function DateSeparator({ label }: { label: string }) {
  const c = useColors();
  return (
    <View style={styles.dateSeparator}>
      <View style={[styles.dateLine, { backgroundColor: c.separator }]} />
      <Text style={[styles.dateText, { color: c.textTertiary, backgroundColor: c.background }]}>
        {label}
      </Text>
      <View style={[styles.dateLine, { backgroundColor: c.separator }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    maxWidth: '80%',
  },
  mine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 20,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
  },
  text: {
    ...typography.sizes.body,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  time: {
    ...typography.sizes.caption2,
  },
  // Date separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    // inverted FlatList: flip so it reads correctly
    transform: [{ scaleY: -1 }],
  },
  dateLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dateText: {
    ...typography.sizes.caption2,
    fontWeight: '500',
    paddingHorizontal: spacing.sm,
  },
});
