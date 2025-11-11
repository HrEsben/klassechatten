import { useEffect, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../utils/supabase';

interface UseReadReceiptsOptions {
  roomId: string;
  userId: string;
  messages: Array<{ id: number; user_id: string }>;
  enabled?: boolean;
}

export function useReadReceipts({
  roomId,
  userId,
  messages,
  enabled = true,
}: UseReadReceiptsOptions) {
  const [isAppActive, setIsAppActive] = useState(true);

  // Track if the app is in foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setIsAppActive(nextAppState === 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Mark messages as read when they appear in view
  const markAsRead = useCallback(
    async (messageIds: number[]) => {
      if (!enabled || messageIds.length === 0 || !isAppActive) return;

      try {
        // Filter out messages sent by current user
        const messagesToMark = messages
          .filter(m => messageIds.includes(m.id) && m.user_id !== userId)
          .map(m => m.id);

        if (messagesToMark.length === 0) return;

        console.log('Marking messages as read:', messagesToMark);

        // Batch insert read receipts
        const receipts = messagesToMark.map(messageId => ({
          message_id: messageId,
          user_id: userId,
          read_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('read_receipts')
          .upsert(receipts, {
            onConflict: 'message_id,user_id',
            ignoreDuplicates: false,
          });

        if (error) {
          console.error('Error marking messages as read:', error);
        } else {
          console.log('Successfully marked messages as read:', messagesToMark);
        }
      } catch (err) {
        console.error('Failed to mark messages as read:', err);
      }
    },
    [enabled, messages, userId, isAppActive]
  );

  // Auto-mark all visible messages as read when app becomes active or messages change
  useEffect(() => {
    if (!enabled || messages.length === 0 || !isAppActive) return;

    // Add a small delay to avoid marking messages immediately
    const timer = setTimeout(() => {
      const allMessageIds = messages.map(m => m.id);
      markAsRead(allMessageIds);
    }, 1000); // Wait 1 second before marking as read

    return () => clearTimeout(timer);
  }, [messages, enabled, isAppActive, markAsRead]);

  return {
    markAsRead,
  };
}
