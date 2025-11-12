import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from './supabase-server';

/**
 * Cached function to get user classes with rooms
 * Uses React cache for deduplication during the request lifecycle
 */
export const getUserClasses = cache(async (userId: string) => {
  const cachedFn = unstable_cache(
    async (uid: string) => {
      // Get classes the user is a member of
      const { data: memberships, error: memberError } = await supabaseAdmin
        .from('class_members')
        .select(`
          class_id,
          classes (
            id,
            label,
            grade_level,
            schools (
              name
            )
          )
        `)
        .eq('user_id', uid)
        .eq('status', 'active');

      if (memberError) throw new Error(`Failed to load classes: ${memberError.message}`);

      if (!memberships || memberships.length === 0) {
        return [];
      }

      // Get rooms for each class
      const classIds = memberships.map(m => m.class_id);
      const { data: rooms, error: roomError } = await supabaseAdmin
        .from('rooms')
        .select('*')
        .in('class_id', classIds)
        .order('name', { ascending: true });

      if (roomError) throw new Error(`Failed to load rooms: ${roomError.message}`);

      // Combine data  
      const classesWithRooms = memberships.map(membership => {
        const classData = membership.classes as unknown as {
          id: string;
          label: string;
          grade_level: number;
          schools?: { name: string };
        };
        const classRooms = rooms?.filter(r => r.class_id === membership.class_id) || [];

        return {
          id: classData.id,
          label: classData.label,
          grade_level: classData.grade_level,
          school_name: classData.schools?.name,
          rooms: classRooms,
        };
      });

      return classesWithRooms;
    },
    [`user-classes-${userId}`],
    {
      revalidate: 300, // 5 minutes - class data doesn't change often
    }
  );

  return cachedFn(userId);
});

/**
 * Cached function to get initial room messages
 * This is for the initial load - real-time updates will still use client-side subscriptions
 */
export const getRoomMessages = cache(async (roomId: string, limit: number = 50) => {
  const cachedFn = unstable_cache(
    async (rId: string, lmt: number) => {
      const { data: messages, error } = await supabaseAdmin
        .from('messages')
        .select(`
          *,
          profiles (
            display_name,
            avatar_url,
            avatar_color
          ),
          read_receipts (
            user_id,
            read_at
          )
        `)
        .eq('room_id', rId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(lmt);

      if (error) throw new Error(`Failed to load messages: ${error.message}`);

      // Reverse to get chronological order (oldest first)
      return messages?.reverse() || [];
    },
    [`room-messages-${roomId}-${limit}`],
    {
      revalidate: 30, // 30 seconds - messages are real-time
    }
  );

  return cachedFn(roomId, limit);
});

/**
 * Cached function to get room information
 */
export const getRoomInfo = cache(async (roomId: string) => {
  const cachedFn = unstable_cache(
    async (rId: string) => {
      const { data: room, error } = await supabaseAdmin
        .from('rooms')
        .select(`
          *,
          classes (
            id,
            label,
            grade_level,
            schools (
              name
            )
          )
        `)
        .eq('id', rId)
        .single();

      if (error) throw new Error(`Failed to load room: ${error.message}`);

      return room;
    },
    [`room-info-${roomId}`],
    {
      revalidate: 3600, // 1 hour - room info changes rarely
    }
  );

  return cachedFn(roomId);
});

/**
 * Cached function to get user profile
 */
export const getUserProfile = cache(async (userId: string) => {
  const cachedFn = unstable_cache(
    async (uid: string) => {
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', uid)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw new Error(`Failed to load profile: ${error.message}`);
      }

      return profile;
    },
    [`user-profile-${userId}`],
    {
      revalidate: 300, // 5 minutes
    }
  );

  return cachedFn(userId);
});