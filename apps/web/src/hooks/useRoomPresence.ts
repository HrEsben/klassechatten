'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  user_id: string;
  display_name: string;
  typing?: boolean;
  last_seen?: string;
}

interface UseRoomPresenceOptions {
  roomId: string;
  userId: string;
  displayName: string;
  enabled?: boolean;
}

export function useRoomPresence({
  roomId,
  userId,
  displayName,
  enabled = true,
}: UseRoomPresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const [typingUsers, setTypingUsers] = useState<PresenceState[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Track reconnection state
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);
  const maxRetries = 5;
  const baseDelay = 1000;

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

  // Track user presence
  const trackPresence = useCallback(async (presenceChannel: RealtimeChannel) => {
    try {
      await presenceChannel.track({
        user_id: userId,
        display_name: displayName,
        typing: false,
        last_seen: new Date().toISOString(),
      });
      console.log('✅ Presence tracked for:', displayName);
    } catch (err) {
      console.error('❌ Error tracking presence:', err);
    }
  }, [userId, displayName]);

  // Attempt reconnection
  const attemptReconnect = useCallback(async (currentChannel: RealtimeChannel) => {
    if (isReconnectingRef.current) return;

    if (retryCountRef.current >= maxRetries) {
      console.warn('Max presence reconnection attempts reached');
      setIsReconnecting(false);
      return;
    }

    isReconnectingRef.current = true;
    retryCountRef.current += 1;
    setIsReconnecting(true);

    console.log(`🔄 Attempting presence reconnection (${retryCountRef.current}/${maxRetries})...`);

    try {
      // Unsubscribe current channel
      await currentChannel.unsubscribe();
      
      // Small delay before resubscribing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Presence reconnection successful');
      
      retryCountRef.current = 0;
      isReconnectingRef.current = false;
      setIsReconnecting(false);
      
    } catch (err) {
      console.error('❌ Presence reconnection failed:', err);
      isReconnectingRef.current = false;
      
      // Schedule next retry
      const delay = getBackoffDelay(retryCountRef.current);
      console.log(`⏱️ Next presence retry in ${Math.round(delay / 1000)}s`);
      
      retryTimeoutRef.current = setTimeout(() => {
        attemptReconnect(currentChannel);
      }, delay);
    }
  }, [getBackoffDelay, maxRetries]);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `presence:room.${roomId}`;
    console.log('🔌 Setting up presence channel:', channelName);

    const presenceChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Track presence state changes
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        console.log('👥 Presence sync:', state);

        // Flatten presence state to array
        const users: PresenceState[] = [];
        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (presences && presences.length > 0) {
            const presence = presences[0] as unknown as PresenceState;
            if (presence.user_id && presence.display_name) {
              users.push(presence);
            }
          }
        });

        setOnlineUsers(users);
        setTypingUsers(users.filter((u) => u.typing));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👋 User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        console.log('📡 Presence status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Presence subscribed for:', displayName);
          setIsConnected(true);
          setIsReconnecting(false);
          retryCountRef.current = 0;
          clearRetryTimeout();
          
          // Track this user's presence
          await trackPresence(presenceChannel);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Presence channel error, attempting reconnection...');
          setIsConnected(false);
          attemptReconnect(presenceChannel);
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Presence connection timed out, attempting reconnection...');
          setIsConnected(false);
          attemptReconnect(presenceChannel);
        } else if (status === 'CLOSED') {
          console.log('🔌 Presence channel closed');
          setIsConnected(false);
        }
      });

    setChannel(presenceChannel);

    // Cleanup
    return () => {
      console.log('🔌 Unsubscribing from presence channel');
      clearRetryTimeout();
      retryCountRef.current = 0;
      isReconnectingRef.current = false;
      presenceChannel.unsubscribe();
    };
  }, [roomId, userId, displayName, enabled, trackPresence, attemptReconnect, clearRetryTimeout]);

  // Update typing status
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!channel) return;

      await channel.track({
        user_id: userId,
        display_name: displayName,
        typing: isTyping,
        last_seen: new Date().toISOString(),
      });
    },
    [channel, userId, displayName]
  );

  return {
    onlineUsers,
    typingUsers,
    setTyping,
    onlineCount: onlineUsers.length,
    isConnected,
    isReconnecting,
  };
}
