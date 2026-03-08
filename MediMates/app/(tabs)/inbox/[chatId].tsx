/**
 * Chat screen — Full-featured 1:1 real-time messaging for med matches.
 *
 * Features:
 * - Custom header with mate avatar, name, shared medication badge
 * - iMessage-style bubbles with timestamps & read receipts
 * - Date separators between message groups
 * - Scroll-to-bottom FAB for long conversations
 * - Keyboard-avoiding layout (iOS)
 * - Empty chat welcome state
 * - Report & Block functionality
 * - Content moderation & medical disclaimer
 * - Chat consent (one-time)
 * - Client-side content filtering
 * - Mark messages as read
 */

import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/src/design-system/theme-provider';
import { spacing, typography } from '@/src/design-system/tokens';
import { Avatar } from '@/src/design-system/components/avatar';
import { PressableScale } from '@/src/design-system/components/pressable-scale';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MessageBubble, DateSeparator } from '@/src/features/chat/components/message-bubble';
import { ChatInput } from '@/src/features/chat/components/chat-input';
import {
  useMedMatchChat,
  useSendMedMatchMessage,
} from '@/src/features/mates/hooks/use-med-matching';
import { useAuthStore } from '@/src/stores/auth-store';
import { useUIStore } from '@/src/stores/ui-store';
import { db } from '@/src/lib/firebase';
import { doc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import type { MessageDoc, ReportReason } from '@/src/types/firebase';

// Moderation imports
import {
  checkMessageContent,
  DisclaimerBanner,
  ChatConsentModal,
  ContentWarningToast,
  ReportModal,
  showBlockConfirm,
  useReportUser,
  useBlockUser,
  useChatConsent,
} from '@/src/features/moderation';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type ListItem =
  | { type: 'message'; data: MessageDoc }
  | { type: 'date'; label: string; id: string };

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - msgDay.getTime();
  const dayMs = 86400000;

  if (diff === 0) return 'Today';
  if (diff === dayMs) return 'Yesterday';
  if (diff < 7 * dayMs) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
  });
}

function getDateKey(ts: any): string {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ──────────────────────────────────────────────
// Screen
// ──────────────────────────────────────────────

export default function MedMatchChatScreen() {
  const c = useColors();
  const router = useRouter();
  const {
    chatId,
    mateName = 'Mate',
    mateAvatar = '',
    mateUid = '',
    medName = '',
    medColor = '#007AFF',
  } = useLocalSearchParams<{
    chatId: string;
    mateName?: string;
    mateAvatar?: string;
    mateUid?: string;
    medName?: string;
    medColor?: string;
  }>();

  const { data: messages, isLoading } = useMedMatchChat(chatId);
  const sendMessage = useSendMedMatchMessage(chatId);
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const flatListRef = useRef<FlatList>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // ── Moderation state ──
  const [contentWarning, setContentWarning] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const reportUser = useReportUser();
  const blockUser = useBlockUser();
  const { hasConsented, isLoading: consentLoading, acceptConsent } = useChatConsent();
  const [showConsent, setShowConsent] = useState(false);

  const currentUid = user?.uid ?? 'me';

  // ── Track match status (disable chat when expired) ──
  const [matchExpired, setMatchExpired] = useState(false);

  useEffect(() => {
    if (!chatId) return;
    const unsub = onSnapshot(doc(db, 'medMatches', chatId), (snap) => {
      if (!snap.exists()) {
        setMatchExpired(true);
        return;
      }
      const status = snap.data()?.status;
      if (status && status !== 'matched') {
        setMatchExpired(true);
      }
    });
    return unsub;
  }, [chatId]);

  // ── Show consent modal if not accepted yet ──
  useEffect(() => {
    if (!consentLoading && !hasConsented) {
      setShowConsent(true);
    }
  }, [consentLoading, hasConsented]);

  // ── Mark messages as read ──
  useEffect(() => {
    if (!messages?.length || !user?.uid) return;
    const unreadIds = messages
      .filter((m) => m.senderUid !== user.uid && !(m.readBy ?? []).includes(user.uid))
      .map((m) => m.id);
    if (unreadIds.length === 0) return;

    // Mark each unread message
    for (const msgId of unreadIds) {
      updateDoc(doc(db, 'medMatches', chatId, 'messages', msgId), {
        readBy: arrayUnion(user.uid),
      }).catch(() => {});
    }
  }, [messages, user?.uid, chatId]);

  // ── Build list items with date separators ──
  const listItems = useMemo(() => {
    if (!messages?.length) return [];

    // Sort chronologically first (oldest → newest), then we'll reverse for inverted FlatList
    const sorted = [...messages].sort(
      (a, b) =>
        (a.createdAt?.toDate?.()?.getTime() ?? 0) -
        (b.createdAt?.toDate?.()?.getTime() ?? 0),
    );

    const items: ListItem[] = [];
    let lastDateKey = '';

    for (const msg of sorted) {
      const dk = getDateKey(msg.createdAt);
      if (dk && dk !== lastDateKey) {
        lastDateKey = dk;
        const label = msg.createdAt?.toDate
          ? formatDateLabel(msg.createdAt.toDate())
          : '';
        items.push({ type: 'date', label, id: `date-${dk}` });
      }
      items.push({ type: 'message', data: msg });
    }

    // Reverse for inverted FlatList (newest first)
    return items.reverse();
  }, [messages]);

  // ── Send with content filtering ──
  const handleSend = useCallback(
    (text: string) => {
      if (matchExpired) {
        showToast({ type: 'error', title: 'This match has ended' });
        return;
      }

      // Client-side content moderation
      const check = checkMessageContent(text);

      if (check.shouldBlock) {
        // Message blocked — show warning
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setContentWarning(check.warningMessage);
        return;
      }

      if (check.shouldWarn) {
        // Show warning but allow sending
        setContentWarning(check.warningMessage);
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      sendMessage.mutate(text, {
        onError: (err) => {
          console.warn('[Chat] Send failed:', err);
          showToast({ type: 'error', title: 'Message could not be sent' });
        },
        onSuccess: () => {
          // Scroll to bottom after sending
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 100);
        },
      });
    },
    [sendMessage, showToast, matchExpired],
  );

  // ── Report (enhanced) ──
  const handleReport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReportModalVisible(true);
  }, []);

  const handleReportSubmit = useCallback(
    (reason: ReportReason, detail: string) => {
      reportUser.mutate(
        {
          reportedUid: mateUid,
          reason,
          reasonDetail: detail,
          chatId,
        },
        {
          onSuccess: () => {
            setReportModalVisible(false);
            showToast({
              type: 'info',
              title: 'Report sent',
              message: 'Your report will be reviewed. Thank you.',
            });
          },
          onError: () => {
            showToast({ type: 'error', title: 'Failed to send report' });
          },
        },
      );
    },
    [reportUser, mateUid, chatId, showToast],
  );

  // ── Block ──
  const handleBlock = useCallback(() => {
    showBlockConfirm({
      userName: mateName,
      onBlock: () => {
        blockUser.mutate(mateUid, {
          onSuccess: () => {
            showToast({
              type: 'info',
              title: `${mateName} has been blocked`,
              message: 'This user can no longer send you messages.',
            });
            router.back();
          },
          onError: () => {
            showToast({ type: 'error', title: 'Blocking failed' });
          },
        });
      },
      onCancel: () => {},
    });
  }, [blockUser, mateUid, mateName, showToast, router]);

  // ── Scroll ──
  const handleScroll = useCallback(
    (e: any) => {
      const offset = e.nativeEvent.contentOffset.y;
      setShowScrollBtn(offset > 300);
    },
    [],
  );

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // ── Render items ──
  let messageIndex = 0;
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'date') {
        return <DateSeparator label={item.label} />;
      }
      return (
        <MessageBubble
          message={item.data}
          isMine={item.data.senderUid === currentUid}
          index={0}
          accentColor={medColor}
        />
      );
    },
    [currentUid, medColor],
  );

  const keyExtractor = useCallback((item: ListItem) => {
    return item.type === 'date' ? item.id : item.data.id;
  }, []);

  // ── Custom header ──
  const HeaderRight = useCallback(
    () => (
      <View style={styles.headerRightRow}>
        <PressableScale onPress={handleReport} style={styles.headerBtn}>
          <IconSymbol name="exclamationmark.shield.fill" size={18} color={c.textTertiary} />
        </PressableScale>
        <PressableScale onPress={handleBlock} style={styles.headerBtn}>
          <IconSymbol name="hand.raised.fill" size={18} color={c.textTertiary} />
        </PressableScale>
      </View>
    ),
    [handleReport, handleBlock, c],
  );

  const HeaderTitle = useCallback(
    () => (
      <Pressable
        style={styles.headerTitle}
        onPress={() => {
          // Could open profile sheet in future
        }}
      >
        <Avatar uri={mateAvatar || undefined} name={mateName} size="sm" />
        <View style={styles.headerTitleText}>
          <Text style={[styles.headerName, { color: c.textPrimary }]} numberOfLines={1}>
            {mateName}
          </Text>
          {medName ? (
            <View style={styles.headerMedRow}>
              <View style={[styles.headerMedDot, { backgroundColor: medColor }]} />
              <Text style={[styles.headerMedName, { color: c.textTertiary }]} numberOfLines={1}>
                {medName}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    ),
    [c, mateName, mateAvatar, medName, medColor],
  );

  // ── Empty state ──
  const EmptyChat = useCallback(
    () => (
      <View style={styles.emptyChatFlip}>
        <MotiView
          from={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 14 }}
          style={styles.emptyChat}
        >
          <View style={[styles.emptyChatIcon, { backgroundColor: medColor + '20' }]}>
            <IconSymbol name="bubble.left.and.bubble.right" size={36} color={medColor} />
          </View>
          <Text style={[styles.emptyChatTitle, { color: c.textPrimary }]}>
            Meet {mateName}! 👋
          </Text>
          <Text style={[styles.emptyChatSubtitle, { color: c.textSecondary }]}>
            You were matched because you both take{' '}
            <Text style={{ fontWeight: '600', color: medColor }}>{medName || 'the same medication'}</Text>.
            {'\n'}Support each other!
          </Text>
          <View style={[styles.emptyChatWarning, { backgroundColor: c.warningLight ?? '#FFF3CD' }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={14} color={c.warning ?? '#FF9F0A'} />
            <Text style={[styles.emptyChatWarningText, { color: c.textSecondary }]}>
              Experience sharing only, not medical advice.
            </Text>
          </View>
        </MotiView>
      </View>
    ),
    [c, mateName, medName, medColor],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerTitle: HeaderTitle,
          headerRight: HeaderRight,
          headerBackTitle: 'Back',
        }}
      />

      {/* Chat Consent Modal (one-time) */}
      <ChatConsentModal
        visible={showConsent}
        onAccept={async () => {
          await acceptConsent();
          setShowConsent(false);
        }}
        onDecline={() => {
          setShowConsent(false);
          router.back();
        }}
      />

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        reportedName={mateName}
        isSubmitting={reportUser.isPending}
      />

      {/* Medical Disclaimer Banner */}
      <DisclaimerBanner compact />

      {/* Content Warning (shown when message triggers filter) */}
      {contentWarning && (
        <ContentWarningToast
          message={contentWarning}
          onDismiss={() => setContentWarning(null)}
        />
      )}

      <FlatList
        ref={flatListRef}
        style={styles.flatList}
        data={listItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={[
          styles.messageList,
          listItems.length === 0 && styles.emptyMessageList,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={100}
        ListEmptyComponent={!isLoading ? EmptyChat : null}
        maxToRenderPerBatch={15}
        windowSize={11}
      />

      {/* Scroll-to-bottom FAB */}
      {showScrollBtn && (
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', damping: 15 }}
          style={styles.scrollBtnContainer}
        >
          <PressableScale onPress={scrollToBottom} style={[styles.scrollBtn, { backgroundColor: c.card, borderColor: c.separator }]}>
            <IconSymbol name="chevron.down" size={16} color={c.textSecondary} />
          </PressableScale>
        </MotiView>
      )}

      <ChatInput onSend={handleSend} disabled={sendMessage.isPending || matchExpired} />
    </KeyboardAvoidingView>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  messageList: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  emptyMessageList: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Header
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: -4,
  },
  headerTitleText: {
    justifyContent: 'center',
    maxWidth: 180,
  },
  headerName: {
    ...typography.sizes.callout,
    fontWeight: '600',
  },
  headerMedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  headerMedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  headerMedName: {
    ...typography.sizes.caption2,
  },
  headerBtn: {
    padding: spacing.xs,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  // Empty state
  emptyChatFlip: {
    transform: [{ scaleY: -1 }], // counter inverted FlatList — must be on a plain View, not MotiView
  },
  emptyChat: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyChatIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyChatTitle: {
    ...typography.sizes.title3,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptyChatSubtitle: {
    ...typography.sizes.footnote,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  emptyChatWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  emptyChatWarningText: {
    ...typography.sizes.caption2,
    flex: 1,
  },

  // Scroll-to-bottom
  scrollBtnContainer: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 72,
    zIndex: 10,
  },
  scrollBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
});
