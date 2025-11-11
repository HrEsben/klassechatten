import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
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

  useEffect(() => {
    if (!enabled) return;

    const channelName = `presence:room.${roomId}`;
    console.log('Setting up presence channel:', channelName);

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
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await presenceChannel.track({
            user_id: userId,
            display_name: displayName,
            typing: false,
            last_seen: new Date().toISOString(),
          });
        }
      });

    setChannel(presenceChannel);

    // Cleanup
    return () => {
      presenceChannel.unsubscribe();
    };
  }, [roomId, userId, displayName, enabled]);

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
    onlineUsers: onlineUsers.filter((u) => u.user_id !== userId), // Exclude self
    typingUsers: typingUsers.filter((u) => u.user_id !== userId), // Exclude self
    setTyping,
    onlineCount: onlineUsers.length,
  };
}
