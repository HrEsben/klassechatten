'use client';

import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Track if the browser tab is visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Mark messages as read when they appear in view
  const markAsRead = useCallback(
    async (messageIds: number[]) => {
      if (!enabled || messageIds.length === 0 || !isTabVisible) return;

      try {
        // Filter out messages sent by current user (don't mark own messages as read)
        const messagesToMark = messages
          .filter(m => messageIds.includes(m.id) && m.user_id !== userId)
          .map(m => m.id);

        if (messagesToMark.length === 0) return;

        console.log('Marking messages as read:', messagesToMark);

        // Batch insert read receipts (using upsert to handle duplicates)
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
    [enabled, messages, userId, isTabVisible]
  );

  // Auto-mark all visible messages as read when tab becomes visible or messages change
  useEffect(() => {
    if (!enabled || messages.length === 0 || !isTabVisible) return;

    // Add a small delay to avoid marking messages immediately
    const timer = setTimeout(() => {
      const allMessageIds = messages.map(m => m.id);
      markAsRead(allMessageIds);
    }, 1000); // Wait 1 second before marking as read

    return () => clearTimeout(timer);
  }, [messages, enabled, isTabVisible, markAsRead]);

  return {
    markAsRead,
  };
}
