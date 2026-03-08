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

  const isRead = isMine && message.readBy && message.readBy.length > 1;

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

        {/* Inline time + read receipt */}
        <View style={styles.inlineMeta}>
          <Text
            style={[
              styles.inlineTime,
              { color: isMine ? 'rgba(255,255,255,0.6)' : c.textTertiary },
            ]}
          >
            {timeStr}
          </Text>
          {isMine && (
            <View style={styles.readIcon}>
              {isRead ? (
                <IconSymbol name="checkmark" size={10} color="rgba(255,255,255,0.7)" />
              ) : (
                <IconSymbol name="checkmark" size={10} color="rgba(255,255,255,0.4)" />
              )}
            </View>
          )}
        </View>
      </View>
    </MotiView>
  );
}

/** Date separator between messages from different days */
export function DateSeparator({ label }: { label: string }) {
  const c = useColors();
  return (
    <View style={styles.dateSeparator}>
      <View style={[styles.dateChip, { backgroundColor: c.surface }]}>
        <Text style={[styles.dateText, { color: c.textTertiary }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 3,
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
    paddingHorizontal: 14,
    paddingTop: spacing.sm,
    paddingBottom: 6,
    borderRadius: 18,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
  },
  text: {
    ...typography.sizes.body,
    lineHeight: 21,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 2,
  },
  inlineTime: {
    fontSize: 11,
    lineHeight: 14,
  },
  readIcon: {
    marginLeft: 1,
  },
  // Date separator
  dateSeparator: {
    alignItems: 'center',
    marginVertical: spacing.sm + 2,
    // inverted FlatList: flip so it reads correctly
    transform: [{ scaleY: -1 }],
  },
  dateChip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
