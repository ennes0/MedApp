/**
 * useModeration — Hook for report, block, and content moderation actions.
 */

import { useCallback } from 'react';
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/src/lib/firebase';
import { useAuthStore } from '@/src/stores/auth-store';
import { generateId } from '@/src/lib/utils';
import type { ReportReason, BlockDoc, ChatConsentDoc } from '@/src/types/firebase';

// ──────────────────────────────────────────────
// Report
// ──────────────────────────────────────────────

interface ReportParams {
  reportedUid: string;
  reason: ReportReason;
  reasonDetail: string;
  chatId?: string;
  messageId?: string;
  messageText?: string;
}

export function useReportUser() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ReportParams) => {
      if (!user) throw new Error('Not authenticated');
      const id = generateId();
      const report = {
        id,
        reporterId: user.uid,
        reportedUid: params.reportedUid,
        reason: params.reason,
        reasonDetail: params.reasonDetail,
        chatId: params.chatId ?? null,
        messageId: params.messageId ?? null,
        messageText: params.messageText ?? null,
        status: 'pending' as const,
        createdAt: Timestamp.now(),
      };
      await setDoc(doc(db, 'reports', id), report);
      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ──────────────────────────────────────────────
// Block
// ──────────────────────────────────────────────

export function useBlockUser() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockedUid: string) => {
      if (!user) throw new Error('Not authenticated');
      const id = generateId();
      const blockDoc: BlockDoc = {
        id,
        blockerUid: user.uid,
        blockedUid,
        createdAt: Timestamp.now(),
      };
      // Add to blocks collection
      await setDoc(doc(db, 'blocks', id), blockDoc);
      // Also update user's blockList for quick client-side filtering
      await updateDoc(doc(db, 'users', user.uid), {
        blockList: arrayUnion(blockedUid),
      });
      return blockDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['medMatches'] });
    },
  });
}

export function useUnblockUser() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockedUid: string) => {
      if (!user) throw new Error('Not authenticated');

      // Find the block doc
      const blocksSnap = await getDocs(
        query(
          collection(db, 'blocks'),
          where('blockerUid', '==', user.uid),
          where('blockedUid', '==', blockedUid),
        ),
      );

      // Delete block docs
      for (const blockDoc of blocksSnap.docs) {
        await blockDoc.ref.delete();
      }

      // Remove from user's blockList
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const currentList: string[] = data.blockList ?? [];
        await updateDoc(userRef, {
          blockList: currentList.filter((uid) => uid !== blockedUid),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
    },
  });
}

export function useBlockedUsers() {
  const user = useAuthStore((s) => s.user);
  return user?.blockList ?? [];
}

// ──────────────────────────────────────────────
// Chat Consent (Disclaimer acceptance)
// ──────────────────────────────────────────────

const CURRENT_CONSENT_VERSION = '1.0';

export function useChatConsent() {
  const user = useAuthStore((s) => s.user);

  const { data: hasConsented, isLoading } = useQuery({
    queryKey: ['chatConsent', user?.uid],
    queryFn: async () => {
      if (!user) return false;
      const consentDoc = await getDoc(doc(db, 'chatConsents', user.uid));
      if (!consentDoc.exists()) return false;
      const data = consentDoc.data() as ChatConsentDoc;
      return data.version === CURRENT_CONSENT_VERSION;
    },
    enabled: !!user,
    staleTime: Infinity,
  });

  const acceptConsent = useCallback(async () => {
    if (!user) return;
    const consent: ChatConsentDoc = {
      uid: user.uid,
      acceptedAt: Timestamp.now(),
      version: CURRENT_CONSENT_VERSION,
    };
    await setDoc(doc(db, 'chatConsents', user.uid), consent);
  }, [user]);

  return {
    hasConsented: hasConsented ?? false,
    isLoading,
    acceptConsent,
  };
}
