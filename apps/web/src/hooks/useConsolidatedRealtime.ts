'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  user_id: string;
  display_name: string;
  typing?: boolean;
  last_seen?: string;
}

interface RealtimeEventHandlers {
  onMessageInsert?: (message: any) => void;
  onMessageUpdate?: (message: any) => void;
  onMessageDelete?: (message: any) => void;
  onReactionInsert?: (reaction: any) => void;
  onReactionDelete?: (reaction: any) => void;
  onReadReceiptInsert?: (receipt: any) => void;
  onPresenceSync?: (presences: Record<string, PresenceState[]>) => void;
  onPresenceJoin?: (key: string, presence: PresenceState) => void;
  onPresenceLeave?: (key: string, presence: PresenceState) => void;
}

interface UseConsolidatedRealtimeOptions {
  roomId: string;
  userId?: string;
  displayName?: string;
  handlers: RealtimeEventHandlers;
  enabled?: boolean;
}

/**
 * Consolidated realtime hook - manages a single channel per room for all realtime events
 * Replaces: useRoomMessages, useReactions, useRoomPresence, useReadReceipts realtime subscriptions
 */
export function useConsolidatedRealtime({
  roomId,
  userId,
  displayName,
  handlers,
  enabled = true,
}: UseConsolidatedRealtimeOptions) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Track reconnection state
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);
  const maxRetries = 5;
  const baseDelay = 1000;

  // Debounce timer for batch updates
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<{
    messages: any[];
    reactions: any[];
    receipts: any[];
  }>({
    messages: [],
    reactions: [],
    receipts: [],
  });

  // Calculate exponential backoff delay
  const getBackoffDelay = useCallback((retryCount: number): number => {
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000);
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }, []);

  // Clear retry timeout
  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Clear update timer
  const clearUpdateTimer = useCallback(() => {
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  }, []);

  // Flush pending updates
  const flushUpdates = useCallback(() => {
    const updates = pendingUpdatesRef.current;
    
    // Process batched updates
    if (updates.messages.length > 0 && handlers.onMessageInsert) {
      updates.messages.forEach(msg => handlers.onMessageInsert?.(msg));
      updates.messages = [];
    }
    
    if (updates.reactions.length > 0 && handlers.onReactionInsert) {
      updates.reactions.forEach(reaction => handlers.onReactionInsert?.(reaction));
      updates.reactions = [];
    }
    
    if (updates.receipts.length > 0 && handlers.onReadReceiptInsert) {
      updates.receipts.forEach(receipt => handlers.onReadReceiptInsert?.(receipt));
      updates.receipts = [];
    }
    
    clearUpdateTimer();
  }, [handlers, clearUpdateTimer]);

  // Schedule batched update flush
  const scheduleBatchUpdate = useCallback((type: 'message' | 'reaction' | 'receipt', data: any) => {
    // Add to pending updates
    if (type === 'message') {
      pendingUpdatesRef.current.messages.push(data);
    } else if (type === 'reaction') {
      pendingUpdatesRef.current.reactions.push(data);
    } else if (type === 'receipt') {
      pendingUpdatesRef.current.receipts.push(data);
    }
    
    // Clear existing timer
    clearUpdateTimer();
    
    // Schedule flush in 100ms (batch updates within this window)
    updateTimerRef.current = setTimeout(flushUpdates, 100);
  }, [flushUpdates, clearUpdateTimer]);

  // Track user presence
  const trackPresence = useCallback(async (presenceChannel: RealtimeChannel) => {
    if (!userId || !displayName) return;
    
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

  // Update typing status
  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!channel || !userId || !displayName) return;
    
    try {
      await channel.track({
        user_id: userId,
        display_name: displayName,
        typing: isTyping,
        last_seen: new Date().toISOString(),
      });
    } catch (err) {
      console.error('❌ Error updating typing status:', err);
    }
  }, [channel, userId, displayName]);

  // Attempt reconnection
  const attemptReconnect = useCallback(async (currentChannel: RealtimeChannel) => {
    if (isReconnectingRef.current) return;

    if (retryCountRef.current >= maxRetries) {
      console.warn('Max reconnection attempts reached');
      setIsReconnecting(false);
      return;
    }

    isReconnectingRef.current = true;
    retryCountRef.current += 1;
    setIsReconnecting(true);

    console.log(`🔄 Attempting consolidated realtime reconnection (${retryCountRef.current}/${maxRetries})...`);

    try {
      // Unsubscribe current channel
      await currentChannel.unsubscribe();
      
      // Small delay before resubscribing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Reconnection successful');
      
      retryCountRef.current = 0;
      isReconnectingRef.current = false;
      setIsReconnecting(false);
      
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
  }, [getBackoffDelay]);

  // Set up consolidated realtime subscription
  useEffect(() => {
    if (!enabled) return;

    const channelName = `consolidated:room.${roomId}`;
    console.log('🔄 Setting up consolidated realtime channel:', channelName);
    
    const realtimeChannel = supabase.channel(channelName);

    // Subscribe to message events
    realtimeChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('📨 Message INSERT:', payload.new.id);
          if (handlers.onMessageInsert) {
            // Messages are high priority - don't batch them
            handlers.onMessageInsert(payload.new);
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
          console.log('📨 Message UPDATE:', payload.new.id);
          handlers.onMessageUpdate?.(payload.new);
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
          console.log('📨 Message DELETE:', payload.old.id);
          handlers.onMessageDelete?.(payload.old);
        }
      );

    // Subscribe to reaction events (these get batched)
    realtimeChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions',
        },
        (payload) => {
          console.log('👍 Reaction INSERT:', payload.new.id);
          scheduleBatchUpdate('reaction', payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reactions',
        },
        (payload) => {
          console.log('👍 Reaction DELETE:', payload.old.id);
          handlers.onReactionDelete?.(payload.old);
        }
      );

    // Subscribe to read receipt events (these get batched)
    realtimeChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'read_receipts',
        },
        (payload) => {
          console.log('✓ Read receipt INSERT:', payload.new.message_id);
          scheduleBatchUpdate('receipt', payload.new);
        }
      );

    // Subscribe to presence events
    if (userId && displayName) {
      realtimeChannel
        .on('presence', { event: 'sync' }, () => {
          const state = realtimeChannel.presenceState();
          console.log('👥 Presence sync:', Object.keys(state).length, 'users');
          // Cast to any first to avoid type issues with Supabase's presence state type
          handlers.onPresenceSync?.(state as any);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('👥 User joined:', key);
          newPresences.forEach((presence: any) => {
            handlers.onPresenceJoin?.(key, presence);
          });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('👥 User left:', key);
          leftPresences.forEach((presence: any) => {
            handlers.onPresenceLeave?.(key, presence);
          });
        });
    }

    // Subscribe to channel
    realtimeChannel.subscribe(async (status) => {
      console.log('📡 Consolidated channel status:', status);
      
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setIsReconnecting(false);
        retryCountRef.current = 0;
        clearRetryTimeout();
        
        // Track presence if user is logged in
        if (userId && displayName) {
          await trackPresence(realtimeChannel);
        }
        
        console.log('✅ Consolidated realtime channel subscribed');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('❌ Consolidated channel error:', status);
        setIsConnected(false);
        attemptReconnect(realtimeChannel);
      } else if (status === 'CLOSED') {
        console.log('🔌 Consolidated channel closed');
        setIsConnected(false);
      }
    });

    setChannel(realtimeChannel);

    return () => {
      console.log('🧹 Cleaning up consolidated realtime channel');
      clearRetryTimeout();
      clearUpdateTimer();
      flushUpdates(); // Flush any pending updates before cleanup
      realtimeChannel.unsubscribe();
    };
  }, [
    roomId,
    enabled,
    userId,
    displayName,
    handlers,
    trackPresence,
    attemptReconnect,
    clearRetryTimeout,
    clearUpdateTimer,
    flushUpdates,
    scheduleBatchUpdate,
  ]);

  return {
    channel,
    isConnected,
    isReconnecting,
    updateTypingStatus,
  };
}
