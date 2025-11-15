'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ClassRoom {
  id: string;
  class_id: string;
  name: string;
  type: 'general' | 'topic';
  is_locked: boolean;
  created_at: string;
}

interface ClassWithRooms {
  id: string;
  label: string;
  grade_level: number;
  school_name?: string;
  rooms: ClassRoom[];
  is_class_admin?: boolean;
  user_role?: 'child' | 'guardian' | 'adult';
  nickname?: string;
  moderation_level?: 'strict' | 'moderate' | 'relaxed';
  profanity_filter_enabled?: boolean;
}

export function useUserClasses() {
  const [classes, setClasses] = useState<ClassWithRooms[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get classes the user is a member of
      const { data: memberships, error: memberError } = await supabase
        .from('class_members')
        .select(`
          class_id,
          role_in_class,
          is_class_admin,
          classes (
            id,
            label,
            grade_level,
            nickname,
            moderation_level,
            profanity_filter_enabled,
            schools (
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      console.log('Memberships query result:', { memberships, memberError });

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setClasses([]);
        return;
      }

      // Get rooms for each class
      const classIds = memberships.map(m => m.class_id);
      const { data: rooms, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .in('class_id', classIds)
        .order('name', { ascending: true });

      if (roomError) throw roomError;

      // Combine data  
      const classesWithRooms: ClassWithRooms[] = memberships.map(membership => {
        const classData = membership.classes as unknown as {
          id: string;
          label: string;
          grade_level: number;
          nickname?: string;
          moderation_level?: 'strict' | 'moderate' | 'relaxed';
          profanity_filter_enabled?: boolean;
          schools?: { name: string };
        };
        const classRooms = rooms?.filter(r => r.class_id === membership.class_id) || [];

        return {
          id: classData.id,
          label: classData.label,
          grade_level: classData.grade_level,
          school_name: classData.schools?.name,
          rooms: classRooms,
          is_class_admin: membership.is_class_admin ?? false,
          user_role: membership.role_in_class,
          nickname: classData.nickname,
          moderation_level: classData.moderation_level || 'moderate',
          profanity_filter_enabled: classData.profanity_filter_enabled ?? true,
        };
      });

      setClasses(classesWithRooms);
    } catch (err) {
      console.error('Error loading classes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  return { classes, loading, error, refresh: loadClasses };
}
