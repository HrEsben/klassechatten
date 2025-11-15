'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface RoomUser {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  avatar_color?: string;
  role_in_class?: string;
  is_template?: boolean;
}

interface UseRoomUsersOptions {
  roomId: string;
  enabled?: boolean;
}

export function useRoomUsers({ roomId, enabled = true }: UseRoomUsersOptions) {
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) {
      setLoading(false);
      return;
    }

    const fetchRoomUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching users for room:', roomId);

        // First, get the class_id from the room
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('class_id')
          .eq('id', roomId)
          .single();

        if (roomError) {
          console.error('Room query error:', roomError);
          throw new Error(`Failed to fetch room: ${roomError.message || JSON.stringify(roomError)}`);
        }

        if (!room) {
          throw new Error('Room not found');
        }

        console.log('Room class_id:', room.class_id);

        // Fetch all class members with their profiles
        // Note: We join profiles via user_id (both reference auth.users.id)
        const { data: members, error: membersError } = await supabase
          .from('class_members')
          .select(`
            user_id,
            role_in_class,
            profiles (
              display_name,
              avatar_url,
              avatar_color,
              is_placeholder
            )
          `)
          .eq('class_id', room.class_id)
          .eq('status', 'active');

        if (membersError) {
          console.error('Members query error:', membersError);
          throw new Error(`Failed to fetch members: ${membersError.message || JSON.stringify(membersError)}`);
        }

        console.log('Fetched members:', members?.length || 0);

        // Filter out any members without profiles and map to RoomUser format
        const roomUsers: RoomUser[] = (members || [])
          .filter((member: any) => member.profiles && !member.profiles.is_placeholder)
          .map((member: any) => ({
            user_id: member.user_id,
            display_name: member.profiles.display_name,
            avatar_url: member.profiles.avatar_url,
            avatar_color: member.profiles.avatar_color,
            role_in_class: member.role_in_class,
            is_template: member.profiles.is_placeholder || false,
          }))
          .sort((a, b) => a.display_name.localeCompare(b.display_name, 'da'));

        console.log('Room users after filtering:', roomUsers.length);
        setUsers(roomUsers);
      } catch (err) {
        console.error('Error fetching room users:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
        console.error('Error message:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomUsers();
  }, [roomId, enabled]);

  return { users, loading, error };
}
