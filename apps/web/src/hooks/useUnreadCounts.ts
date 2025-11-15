'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadCount {
  room_id: string;
  unread_count: number;
}

/**
 * Hook to fetch and subscribe to unread message counts per room
 * Returns a map of room_id -> unread_count
 */
export function useUnreadCounts() {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUnreadCounts({});
      setLoading(false);
      return;
    }

    // Fetch initial unread counts
    const fetchUnreadCounts = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase
          .rpc('get_my_unread_counts');

        if (rpcError) {
          console.error('Error fetching unread counts:', rpcError);
          setError(rpcError.message);
          return;
        }

        // Convert array to map for easier lookup
        const countsMap: Record<string, number> = {};
        (data as UnreadCount[] || []).forEach((item) => {
          countsMap[item.room_id] = item.unread_count;
        });

        setUnreadCounts(countsMap);
      } catch (err) {
        console.error('Error in fetchUnreadCounts:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCounts();

    // Subscribe to changes in messages and read_receipts
    // When a new message arrives or a read receipt is created, refetch counts
    const messagesChannel = supabase
      .channel('unread_counts_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // New message arrived, refetch counts
          fetchUnreadCounts();
        }
      )
      .subscribe();

    const readReceiptsChannel = supabase
      .channel('unread_counts_read_receipts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'read_receipts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // User read a message, refetch counts
          fetchUnreadCounts();
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      messagesChannel.unsubscribe();
      readReceiptsChannel.unsubscribe();
    };
  }, [user]);

  /**
   * Get unread count for a specific room
   */
  const getCountForRoom = (roomId: string): number => {
    return unreadCounts[roomId] || 0;
  };

  /**
   * Get total unread count across all rooms
   */
  const getTotalCount = (): number => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  };

  return {
    unreadCounts,
    getCountForRoom,
    getTotalCount,
    loading,
    error,
  };
}
