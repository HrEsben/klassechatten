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
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  // Track reconnection state
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);
  
  // Use ref for handlers to avoid recreating the channel
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);
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

  // Update typing status with debouncing to prevent excessive presence updates
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const currentTypingStateRef = useRef<boolean>(false);
  
  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!channel || !userId || !displayName) return;
    
    // Clear any pending typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // If setting typing to true, update immediately
    if (isTyping && !currentTypingStateRef.current) {
      try {
        await channel.track({
          user_id: userId,
          display_name: displayName,
          typing: true,
          last_seen: new Date().toISOString(),
        });
        currentTypingStateRef.current = true;
        
        // Auto-clear typing status after 3 seconds of no updates
        typingTimeoutRef.current = setTimeout(async () => {
          try {
            await channel.track({
              user_id: userId,
              display_name: displayName,
              typing: false,
              last_seen: new Date().toISOString(),
            });
            currentTypingStateRef.current = false;
          } catch (err) {
            console.error('❌ Error clearing typing status:', err);
          }
        }, 3000);
      } catch (err) {
        console.error('❌ Error updating typing status:', err);
      }
    } 
    // If setting typing to false, debounce it
    else if (!isTyping && currentTypingStateRef.current) {
      typingTimeoutRef.current = setTimeout(async () => {
        try {
          await channel.track({
            user_id: userId,
            display_name: displayName,
            typing: false,
            last_seen: new Date().toISOString(),
          });
          currentTypingStateRef.current = false;
        } catch (err) {
          console.error('❌ Error clearing typing status:', err);
        }
      }, 1000); // Wait 1 second before clearing typing status
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
    if (!enabled) {
      console.log('🔵 [useConsolidatedRealtime] Realtime disabled for room:', roomId);
      return;
    }

    const channelName = `consolidated:room.${roomId}`;
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
          console.log('🟢 [useConsolidatedRealtime] Message INSERT received:', payload.new.id);
          console.log('🟢 [useConsolidatedRealtime] Message payload:', { id: payload.new.id, body: payload.new.body?.substring(0, 30), user_id: payload.new.user_id, room_id: payload.new.room_id });
          console.log('🟢 [useConsolidatedRealtime] Handler exists:', !!handlersRef.current.onMessageInsert);
          if (handlersRef.current.onMessageInsert) {
            console.log('🟢 [useConsolidatedRealtime] Calling onMessageInsert handler');
            // Messages are high priority - don't batch them
            handlersRef.current.onMessageInsert(payload.new);
            console.log('🟢 [useConsolidatedRealtime] onMessageInsert handler called');
          } else {
            console.error('🔴 [useConsolidatedRealtime] No onMessageInsert handler!');
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
          handlersRef.current.onMessageUpdate?.(payload.new);
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
          handlersRef.current.onMessageDelete?.(payload.old);
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
          handlersRef.current.onReactionDelete?.(payload.old);
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
          scheduleBatchUpdate('receipt', payload.new);
        }
      );

    // Subscribe to presence events
    if (userId && displayName) {
      // Helper to update presence state only if changed
      const updatePresenceState = (eventType: string) => {
        const state = realtimeChannel.presenceState();
        const users = Object.values(state).flat() as unknown as PresenceState[];
        const newOnlineUsers = users.map((u) => u.user_id).sort();
        const newTypingUsers = users.filter((u) => u.typing).map((u) => u.user_id).sort();
        
        // Only update if arrays actually changed (compare sorted strings)
        setOnlineUsers((prev) => {
          const prevSorted = [...prev].sort();
          const hasChanged = prevSorted.length !== newOnlineUsers.length || 
                           prevSorted.some((id, i) => id !== newOnlineUsers[i]);
          return hasChanged ? newOnlineUsers : prev;
        });
        
        setTypingUsers((prev) => {
          const prevSorted = [...prev].sort();
          const hasChanged = prevSorted.length !== newTypingUsers.length || 
                           prevSorted.some((id, i) => id !== newTypingUsers[i]);
          return hasChanged ? newTypingUsers : prev;
        });
        
        return state;
      };
      
      realtimeChannel
        .on('presence', { event: 'sync' }, () => {
          const state = updatePresenceState('sync');
          handlersRef.current.onPresenceSync?.(state as any);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          const state = updatePresenceState('join');
          
          newPresences.forEach((presence: any) => {
            handlersRef.current.onPresenceJoin?.(key, presence);
          });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          const state = updatePresenceState('leave');
          
          leftPresences.forEach((presence: any) => {
            handlersRef.current.onPresenceLeave?.(key, presence);
          });
        });
    }

    // All event listeners registered

    // Subscribe to channel
    realtimeChannel.subscribe(async (status) => {
      
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setIsReconnecting(false);
        retryCountRef.current = 0;
        clearRetryTimeout();
        
        // Track presence if user is logged in
        if (userId && displayName) {
          await trackPresence(realtimeChannel);
        }
        
        // Channel subscribed successfully
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
      clearRetryTimeout();
      clearUpdateTimer();
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      flushUpdates(); // Flush any pending updates before cleanup
      realtimeChannel.unsubscribe();
    };
  }, [
    roomId,
    enabled,
    userId,
    displayName,
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
    onlineUsers,
    typingUsers,
  };
}
