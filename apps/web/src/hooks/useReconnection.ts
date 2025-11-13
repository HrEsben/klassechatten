'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseReconnectionOptions {
  channel: RealtimeChannel | null;
  onReconnect?: () => void | Promise<void>;
  maxRetries?: number;
  baseDelay?: number; // Base delay in ms for exponential backoff
}

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
  retryCount: number;
}

/**
 * Hook to manage graceful reconnection for Supabase Realtime channels
 * Implements exponential backoff and automatic retry on connection failures
 */
export function useReconnection({
  channel,
  onReconnect,
  maxRetries = 5,
  baseDelay = 1000,
}: UseReconnectionOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isReconnecting: false,
    error: null,
    retryCount: 0,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isReconnectingRef = useRef(false);

  // Clear any pending retry timeouts
  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Calculate exponential backoff delay
  const getBackoffDelay = useCallback((retryCount: number): number => {
    // Exponential backoff: baseDelay * 2^retryCount, capped at 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000);
    // Add jitter (randomness) to prevent thundering herd
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }, [baseDelay]);

  // Attempt to reconnect the channel
  const attemptReconnect = useCallback(async () => {
    if (!channel || isReconnectingRef.current) return;

    if (retryCountRef.current >= maxRetries) {
      console.warn('Max reconnection attempts reached');
      setConnectionState(prev => ({
        ...prev,
        isReconnecting: false,
        error: 'Unable to reconnect. Please refresh the page.',
      }));
      return;
    }

    isReconnectingRef.current = true;
    retryCountRef.current += 1;

    console.log(`Attempting reconnection (${retryCountRef.current}/${maxRetries})...`);

    setConnectionState(prev => ({
      ...prev,
      isReconnecting: true,
      retryCount: retryCountRef.current,
      error: null,
    }));

    try {
      // Unsubscribe and resubscribe
      await channel.unsubscribe();
      
      // Small delay before resubscribing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await channel.subscribe(async (status) => {
        console.log('Reconnection status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('Successfully reconnected!');
          retryCountRef.current = 0; // Reset retry count on success
          isReconnectingRef.current = false;
          
          setConnectionState({
            isConnected: true,
            isReconnecting: false,
            error: null,
            retryCount: 0,
          });

          // Call the reconnect callback to reload data
          if (onReconnect) {
            await onReconnect();
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Reconnection failed, scheduling retry...');
          isReconnectingRef.current = false;
          
          // Schedule next retry with exponential backoff
          const delay = getBackoffDelay(retryCountRef.current);
          console.log(`Next retry in ${Math.round(delay / 1000)}s`);
          
          retryTimeoutRef.current = setTimeout(() => {
            attemptReconnect();
          }, delay);
        }
      });
    } catch (err) {
      console.error('Error during reconnection:', err);
      isReconnectingRef.current = false;
      
      // Schedule next retry
      const delay = getBackoffDelay(retryCountRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        attemptReconnect();
      }, delay);
    }
  }, [channel, maxRetries, getBackoffDelay, onReconnect]);

  // Monitor channel status and trigger reconnection on errors
  useEffect(() => {
    if (!channel) return;

    const handleStatusChange = (status: string) => {
      console.log('Channel status changed:', status);

      if (status === 'SUBSCRIBED') {
        retryCountRef.current = 0;
        clearRetryTimeout();
        setConnectionState({
          isConnected: true,
          isReconnecting: false,
          error: null,
          retryCount: 0,
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('Connection lost, initiating reconnection...');
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          error: 'Connection lost',
        }));
        
        // Don't show error to user, just silently reconnect
        attemptReconnect();
      } else if (status === 'CLOSED') {
        console.log('Channel closed');
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
        }));
      }
    };

    // Note: Supabase doesn't expose a direct status change listener,
    // so we rely on the subscribe callback in the parent hook
    // This is mainly for state management

    return () => {
      clearRetryTimeout();
      isReconnectingRef.current = false;
      retryCountRef.current = 0;
    };
  }, [channel, attemptReconnect, clearRetryTimeout]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    retryCountRef.current = 0; // Reset retry count for manual reconnect
    attemptReconnect();
  }, [attemptReconnect]);

  return {
    ...connectionState,
    reconnect,
  };
}
