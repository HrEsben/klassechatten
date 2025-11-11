'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
  };
  // Read receipts count (how many users have read this message)
  read_receipts?: Array<{
    user_id: string;
    read_at: string;
  }>;
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

  // Backfill: Load initial messages
  const loadMessages = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_user_id_profiles_fkey (
            display_name
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
      setMessages(data ? data.reverse() : []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [roomId, limit, enabled]);

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
          
          // Only add if not deleted
          if (!newMessage.deleted_at) {
            // Fetch profile data for the new message
            const { data: profileData } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', newMessage.user_id)
              .single();
            
            // Add profile data to message
            const messageWithProfile = {
              ...newMessage,
              profiles: profileData ? { display_name: profileData.display_name } : undefined
            };
            
            setMessages((prev) => [...prev, messageWithProfile]);
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
        console.log('Subscription status:', status, err);
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to room ${roomId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to room ${roomId}:`, err);
          setError('Failed to connect to realtime');
        } else if (status === 'TIMED_OUT') {
          console.error(`Subscription timed out for room ${roomId}`);
          setError('Connection timed out');
        } else if (status === 'CLOSED') {
          console.log(`Channel closed for room ${roomId}`);
        }
      });

    setChannel(realtimeChannel);

    // Cleanup
    return () => {
      console.log(`Unsubscribing from room ${roomId}`);
      realtimeChannel.unsubscribe();
    };
  }, [roomId, enabled, loadMessages]);

  const refresh = useCallback(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    loading,
    error,
    refresh,
    isConnected: channel?.state === 'joined',
  };
}
