'use client';

import { useState, useCallback } from 'react';
import { useConsolidatedRealtime } from './useConsolidatedRealtime';

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

  // Handle presence sync
  const handlePresenceSync = useCallback((state: Record<string, PresenceState[]>) => {
    console.log('👥 Presence sync:', state);

    // Flatten presence state to array
    const users: PresenceState[] = [];
    Object.keys(state).forEach((key) => {
      const presences = state[key];
      if (presences && presences.length > 0) {
        const presence = presences[0];
        if (presence.user_id && presence.display_name) {
          users.push(presence);
        }
      }
    });

    setOnlineUsers(users);
    setTypingUsers(users.filter((u) => u.typing));
  }, []);

  // Handle user join
  const handlePresenceJoin = useCallback((key: string, presence: PresenceState) => {
    console.log('👋 User joined:', key, presence);
  }, []);

  // Handle user leave
  const handlePresenceLeave = useCallback((key: string, presence: PresenceState) => {
    console.log('👋 User left:', key, presence);
  }, []);

  // Use consolidated realtime hook
  const { isConnected, isReconnecting, updateTypingStatus } = useConsolidatedRealtime({
    roomId,
    userId,
    displayName,
    enabled,
    handlers: {
      onPresenceSync: handlePresenceSync,
      onPresenceJoin: handlePresenceJoin,
      onPresenceLeave: handlePresenceLeave,
    },
  });

  // Update typing status
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      await updateTypingStatus(isTyping);
    },
    [updateTypingStatus]
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
