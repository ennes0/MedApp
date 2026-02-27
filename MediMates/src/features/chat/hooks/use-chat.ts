/**
 * useChat — hook for a single chat conversation (messages + send).
 */

import { useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  limit as firestoreLimit,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/src/lib/firebase';
import { useFirestoreQuery } from '@/src/lib/firestore-hooks';
import { useAuthStore } from '@/src/stores/auth-store';
import { generateId } from '@/src/lib/utils';
import type { MessageDoc } from '@/src/types/firebase';

export function useChat(pairId: string) {
  const user = useAuthStore((s) => s.user);

  const messagesQuery = useMemo(() => {
    if (!pairId) return null;
    return query(
      collection(db, 'pairs', pairId, 'messages'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(50),
    );
  }, [pairId]);

  return useFirestoreQuery<MessageDoc>({
    queryKey: ['messages', pairId],
    firestoreQuery: messagesQuery,
    enabled: !!pairId,
  });
}

export function useSendMessage(pairId: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error('Not authenticated');
      const id = generateId();
      const msg: MessageDoc = {
        id,
        pairId,
        senderUid: user.uid,
        text,
        createdAt: Timestamp.now(),
        readBy: [user.uid],
      };
      await setDoc(doc(db, 'pairs', pairId, 'messages', id), msg);
      // Update pair's lastMessageAt
      await updateDoc(doc(db, 'pairs', pairId), {
        lastMessageAt: serverTimestamp(),
      });
      return msg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', pairId] });
    },
  });
}
