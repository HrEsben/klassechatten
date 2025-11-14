import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: number;
  room_id: string;
  class_id: string;
  user_id: string;
  body: string;
  image_url?: string;
  reply_to: number | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  meta: Record<string, unknown>;
  // Profile data from join
  profiles?: {
    display_name: string;
    avatar_url?: string;
    avatar_color?: string;
  };
  // Read receipts
  read_receipts?: Array<{
    user_id: string;
    read_at: string;
  }>;
  // Optimistic UI states
  isOptimistic?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
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
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Track reconnection state
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReconnectingRef = useRef(false);
  const maxRetries = 5;
  const baseDelay = 1000;

  // Combine real and optimistic messages
  const allMessages = [...messages, ...optimisticMessages];

  // Add optimistic message
  const addOptimisticMessage = useCallback((message: Partial<Message>) => {
    const optimisticMessage: Message = {
      id: Date.now(), // temporary ID
      room_id: roomId,
      class_id: '',
      user_id: message.user_id || '',
      body: message.body || '',
      image_url: message.image_url,
      reply_to: null,
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      meta: {},
      profiles: message.profiles,
      read_receipts: [],
      isOptimistic: true,
      isLoading: true,
      hasError: false,
      ...message
    };
    
    setOptimisticMessages(prev => [...prev, optimisticMessage]);
    return optimisticMessage.id;
  }, [roomId]);

  // Update optimistic message state
  const updateOptimisticMessage = useCallback((tempId: number, updates: Partial<Message>) => {
    setOptimisticMessages(prev => 
      prev.map(msg => 
        msg.id === tempId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Remove optimistic message (usually when real one arrives or on error)
  const removeOptimisticMessage = useCallback((tempId: number) => {
    setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId));
  }, []);

  // Backfill: Load initial messages
  const loadMessages = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);

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

      if (fetchError) throw fetchError;

      // Reverse to show oldest first
      setMessages(data ? data.reverse() : []);
      setError(null); // Clear error on successful load
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [roomId, limit, enabled]);

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
      setError('Connection lost. Please refresh the app.');
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
    const realtimeChannel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true);
      })
      .on('presence', { event: 'join' }, () => {
        setIsConnected(true);
      })
      .on('presence', { event: 'leave' }, () => {
        setIsConnected(true);
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          console.log('Received new message via realtime:', newMessage);
          console.log('Image URL:', newMessage.image_url);
          
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
            
            // Add real message
            setMessages((prev) => [...prev, messageWithProfile]);
            
            // Remove any matching optimistic messages
            setOptimisticMessages(prev => 
              prev.filter(optMsg => {
                // Remove optimistic messages that match content and user
                const sameUser = optMsg.user_id === newMessage.user_id;
                const sameBody = optMsg.body === newMessage.body;
                const sameImage = optMsg.image_url && newMessage.image_url && 
                                  optMsg.image_url === newMessage.image_url;
                
                // Remove if user matches AND (same text OR same image)
                const shouldRemove = sameUser && (sameBody || sameImage);
                
                if (shouldRemove) {
                  console.log('Removing optimistic message that matches real message:', optMsg.id);
                  return false; // Remove this optimistic message
                }
                return true; // Keep this optimistic message
              })
            );
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
        (payload) => {
          const receipt = payload.new as { message_id: number; user_id: string; read_at: string };
          
          // Update the message to include this read receipt
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === receipt.message_id) {
                const existingReceipts = msg.read_receipts || [];
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
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to room ${roomId}`);
          setIsConnected(true);
          setIsReconnecting(false);
          setError(null);
          retryCountRef.current = 0;
          clearRetryTimeout();
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`⚠️ Channel error for room ${roomId}, attempting reconnection...`);
          setIsConnected(false);
          attemptReconnect(realtimeChannel);
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏱️ Connection timed out for room ${roomId}, attempting reconnection...`);
          setIsConnected(false);
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

  return {
    messages: allMessages,
    loading,
    error,
    refresh,
    isConnected,
    isReconnecting,
    addOptimisticMessage,
    updateOptimisticMessage,
    removeOptimisticMessage,
  };
}
