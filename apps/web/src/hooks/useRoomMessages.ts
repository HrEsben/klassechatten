'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<string | null>(null);
  
  // Track reconnection state
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);
  const maxRetries = 5;
  const baseDelay = 1000;

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

  // Calculate exponential backoff delay
  const getBackoffDelay = useCallback((retryCount: number): number => {
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000);
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }, [baseDelay]);

  // Clear retry timeout
  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Attempt reconnection
  const attemptReconnect = useCallback(async (currentChannel: RealtimeChannel) => {
    if (isReconnectingRef.current) return;

    if (retryCountRef.current >= maxRetries) {
      console.warn('Max reconnection attempts reached');
      setIsReconnecting(false);
      setError('Connection lost. Please refresh the page.');
      return;
    }

    isReconnectingRef.current = true;
    retryCountRef.current += 1;
    setIsReconnecting(true);

    console.log(`🔄 Attempting reconnection (${retryCountRef.current}/${maxRetries})...`);

    try {
      // Unsubscribe current channel
      await currentChannel.unsubscribe();
      
      // Small delay before resubscribing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload messages
      await loadMessages();
      
      // Resubscribe (will happen in the main useEffect)
      console.log('✅ Reconnection successful, messages reloaded');
      
      retryCountRef.current = 0;
      isReconnectingRef.current = false;
      setIsReconnecting(false);
      setError(null);
      
    } catch (err) {
      console.error('❌ Reconnection failed:', err);
      isReconnectingRef.current = false;
      
      // Schedule next retry
      const delay = getBackoffDelay(retryCountRef.current);
      console.log(`⏱️ Next retry in ${Math.round(delay / 1000)}s`);
      
      retryTimeoutRef.current = setTimeout(() => {
        attemptReconnect(currentChannel);
      }, delay);
    }
  }, [loadMessages, getBackoffDelay, maxRetries]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!enabled) return;

    // Load initial messages
    loadMessages();

    // Set up realtime subscription
    const channelName = `realtime:room.${roomId}`;
    console.log('Setting up realtime channel:', channelName);
    
    const realtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('Received INSERT event:', payload);
          const newMessage = payload.new as Message;
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
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('Received UPDATE event:', payload);
          const updatedMessage = payload.new as Message;
          
          setMessages((prev) =>
            prev
              .map((msg) =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
              .filter((msg) => !msg.deleted_at) // Remove if soft-deleted
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('Received DELETE event:', payload);
          const deletedMessage = payload.old as Message;
          
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== deletedMessage.id)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'read_receipts',
        },
        async (payload) => {
          console.log('Received read receipt:', payload);
          const receipt = payload.new as { message_id: number; user_id: string; read_at: string };
          
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
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Subscription status:', status, err);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Successfully subscribed to room ${roomId}`);
          setIsConnected(true);
          setIsReconnecting(false);
          setError(null);
          retryCountRef.current = 0; // Reset retry count on success
          clearRetryTimeout();
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`⚠️ Channel error for room ${roomId}, attempting reconnection...`);
          setIsConnected(false);
          // Don't set error - we'll try to reconnect silently
          attemptReconnect(realtimeChannel);
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏱️ Connection timed out for room ${roomId}, attempting reconnection...`);
          setIsConnected(false);
          // Don't set error - we'll try to reconnect silently
          attemptReconnect(realtimeChannel);
        } else if (status === 'CLOSED') {
          console.log(`🔌 Channel closed for room ${roomId}`);
          setIsConnected(false);
        }
      });

    setChannel(realtimeChannel);

    // Cleanup
    return () => {
      console.log(`🔌 Unsubscribing from room ${roomId}`);
      clearRetryTimeout();
      retryCountRef.current = 0;
      isReconnectingRef.current = false;
      realtimeChannel.unsubscribe();
    };
  }, [roomId, enabled, loadMessages, attemptReconnect, clearRetryTimeout]);

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

  return {
    messages,
    loading,
    error,
    refresh,
    isConnected,
    isReconnecting,
    addOptimisticMessage,
    updateOptimisticMessage,
    loadMore,
    hasMore,
    loadingMore,
  };
}
