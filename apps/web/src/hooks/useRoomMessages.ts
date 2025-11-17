'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useConsolidatedRealtime } from './useConsolidatedRealtime';

interface Message {
  id: number | string; // Allow string for optimistic messages
  room_id: string;
  class_id?: string;
  user_id: string;
  body: string | null;
  image_url?: string | null;
  reply_to: number | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  meta?: Record<string, unknown>;
  // Optimistic message state
  isOptimistic?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
  // Profile data from join
  profiles?: {
    display_name: string;
    avatar_url?: string;
    avatar_color?: string;
  };
  user?: {
    id: string;
    email: string;
    user_metadata: { display_name?: string };
  };
  // Read receipts count (how many users have read this message)
  read_receipts?: Array<{
    user_id: string;
    read_at: string;
  }>;
}

type MessageWithProfiles = Message;

interface OptimisticMessage {
  room_id: string;
  class_id?: string;
  user_id: string;
  body: string | null;
  image_url?: string | null;
  reply_to: number | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  meta?: Record<string, unknown>;
  profiles?: {
    display_name: string;
    avatar_url?: string;
    avatar_color?: string;
  };
  user?: {
    id: string;
    email: string;
    user_metadata: { display_name?: string };
  };
}

interface UseRoomMessagesOptions {
  roomId: string;
  limit?: number;
  enabled?: boolean;
}

export function useRoomMessages({ 
  roomId, 
  limit = 50,
  enabled = true 
}: UseRoomMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<string | null>(null);

  // Backfill: Load initial messages
  const loadMessages = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      // Don't clear error state here - we'll clear it on successful load
      
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_user_id_profiles_fkey (
            display_name,
            avatar_url,
            avatar_color
          ),
          read_receipts (
            user_id,
            read_at
          )
        `)
        .eq('room_id', roomId)
        .is('deleted_at', null) // Don't show deleted messages
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        console.error('Supabase fetch error:', fetchError);
        throw fetchError;
      }

      // Reverse to show oldest first
      const reversedData = data ? data.reverse() : [];
      setMessages(reversedData);
      
      // Set hasMore based on whether we got a full page
      setHasMore(data && data.length === limit);
      
      // Track the oldest message timestamp for pagination
      if (reversedData.length > 0) {
        setOldestMessageTimestamp(reversedData[0].created_at);
      }
      
      setError(null); // Clear error on successful load
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [roomId, limit, enabled]);

  // Load more older messages
  const loadMore = useCallback(async () => {
    if (!enabled || !hasMore || loadingMore || !oldestMessageTimestamp) {
      return;
    }
    
    try {
      setLoadingMore(true);
      console.log('📄 Loading more messages before:', oldestMessageTimestamp);
      
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_user_id_profiles_fkey (
            display_name,
            avatar_url,
            avatar_color
          ),
          read_receipts (
            user_id,
            read_at
          )
        `)
        .eq('room_id', roomId)
        .is('deleted_at', null)
        .lt('created_at', oldestMessageTimestamp) // Get messages older than current oldest
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        console.error('Supabase fetch error:', fetchError);
        throw fetchError;
      }

      // Reverse to show oldest first
      const reversedData = data ? data.reverse() : [];
      
      if (reversedData.length > 0) {
        // Prepend older messages
        setMessages(prev => [...reversedData, ...prev]);
        
        // Update oldest timestamp
        setOldestMessageTimestamp(reversedData[0].created_at);
        
        // Check if there are more messages
        setHasMore(reversedData.length === limit);
        
        console.log(`✅ Loaded ${reversedData.length} more messages`);
      } else {
        setHasMore(false);
        console.log('✅ No more messages to load');
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
      // Don't set a blocking error, just log it
    } finally {
      setLoadingMore(false);
    }
  }, [roomId, limit, enabled, hasMore, loadingMore, oldestMessageTimestamp]);

  // Handle realtime message insert
  const handleMessageInsert = useCallback(async (newMessage: Message) => {
    console.log('Received INSERT event:', newMessage);
    console.log('New message image_url:', newMessage.image_url);
    console.log('New message details:', { id: newMessage.id, body: newMessage.body?.substring(0, 20) });
    
    // Only add if not deleted
    if (!newMessage.deleted_at) {
      // Fetch profile data for the new message
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, avatar_color')
        .eq('user_id', newMessage.user_id)
        .single();
      
      // Add profile data to message
      const messageWithProfile = {
        ...newMessage,
        profiles: profileData ? { 
          display_name: profileData.display_name,
          avatar_url: profileData.avatar_url,
          avatar_color: profileData.avatar_color
        } : undefined
      };
      
      setMessages((prev) => {
        console.log('Adding new message to existing:', prev.map(m => ({ id: m.id, isOptimistic: m.isOptimistic, body: m.body?.substring(0, 20) })));
        
        // Check if this message content matches any optimistic message
        // If so, remove the optimistic message and add the real one
        const filteredPrev = prev.filter(msg => {
          if (msg.isOptimistic && msg.body === newMessage.body && msg.user_id === newMessage.user_id) {
            console.log('Found matching optimistic message, removing:', { optimisticId: msg.id, realId: newMessage.id });
            return false; // Remove the optimistic message
          }
          return true; // Keep other messages
        });
        
        const updated = [...filteredPrev, messageWithProfile];
        console.log('Messages after adding new message:', updated.map(m => ({ id: m.id, isOptimistic: m.isOptimistic, body: m.body?.substring(0, 20) })));
        return updated;
      });
    }
  }, []);

  // Handle realtime message update
  const handleMessageUpdate = useCallback((updatedMessage: Message) => {
    console.log('Received UPDATE event:', updatedMessage);
    
    setMessages((prev) =>
      prev
        .map((msg) =>
          msg.id === updatedMessage.id ? updatedMessage : msg
        )
        .filter((msg) => !msg.deleted_at) // Remove if soft-deleted
    );
  }, []);

  // Handle realtime message delete
  const handleMessageDelete = useCallback((deletedMessage: Message) => {
    console.log('Received DELETE event:', deletedMessage);
    
    setMessages((prev) =>
      prev.filter((msg) => msg.id !== deletedMessage.id)
    );
  }, []);

  // Handle realtime read receipt insert
  const handleReadReceiptInsert = useCallback((receipt: { message_id: number; user_id: string; read_at: string }) => {
    console.log('Received read receipt:', receipt);
    
    // Update the message to include this read receipt
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === receipt.message_id) {
          const existingReceipts = msg.read_receipts || [];
          // Check if this user already has a receipt
          const hasReceipt = existingReceipts.some(r => r.user_id === receipt.user_id);
          if (!hasReceipt) {
            return {
              ...msg,
              read_receipts: [...existingReceipts, { user_id: receipt.user_id, read_at: receipt.read_at }]
            };
          }
        }
        return msg;
      })
    );
  }, []);

  // Use consolidated realtime hook
  const { isConnected, isReconnecting } = useConsolidatedRealtime({
    roomId,
    enabled,
    handlers: {
      onMessageInsert: handleMessageInsert,
      onMessageUpdate: handleMessageUpdate,
      onMessageDelete: handleMessageDelete,
      onReadReceiptInsert: handleReadReceiptInsert,
    },
  });

  // Load initial messages on mount
  useEffect(() => {
    if (enabled) {
      loadMessages();
    }
  }, [enabled, loadMessages]);

  const refresh = useCallback(() => {
    loadMessages();
  }, [loadMessages]);

  // Optimistic message handling
  const addOptimisticMessage = useCallback((optimisticMessage: OptimisticMessage): string => {
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const fullOptimisticMessage: MessageWithProfiles = {
      ...optimisticMessage,
      id: tempId,
      isOptimistic: true,
      isLoading: true,
      hasError: false,
    };
    
    setMessages(prev => [...prev, fullOptimisticMessage]);
    return tempId;
  }, []);

  const updateOptimisticMessage = useCallback((tempId: string, success: boolean): void => {
    console.log(`updateOptimisticMessage called: tempId=${tempId}, success=${success}`);
    setMessages(prev => {
      console.log('Current messages before update:', prev.map(m => ({ id: m.id, isOptimistic: m.isOptimistic, body: m.body?.substring(0, 20) })));
      
      if (success) {
        // Remove optimistic message on success - real message will come via realtime
        const filtered = prev.filter(msg => msg.id !== tempId);
        console.log('Messages after removing optimistic:', filtered.map(m => ({ id: m.id, isOptimistic: m.isOptimistic, body: m.body?.substring(0, 20) })));
        return filtered;
      } else {
        // Update optimistic message with error state
        return prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, isLoading: false, hasError: true }
            : msg
        );
      }
    });
  }, []);

  const updateOptimisticMessageImage = useCallback((tempId: string, imageUrl: string): void => {
    console.log(`updateOptimisticMessageImage called: tempId=${tempId}, imageUrl=${imageUrl}`);
    setMessages(prev => {
      return prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, image_url: imageUrl, isLoading: false }
          : msg
      );
    });
  }, []);

  return {
    messages,
    loading,
    error,
    refresh,
    isConnected,
    isReconnecting,
    addOptimisticMessage,
    updateOptimisticMessage,
    updateOptimisticMessageImage,
    loadMore,
    hasMore,
    loadingMore,
  };
}
