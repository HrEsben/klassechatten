import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

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
          classes (
            id,
            label,
            grade_level,
            schools (
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

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
        const classData = membership.classes as any;
        const classRooms = rooms?.filter(r => r.class_id === membership.class_id) || [];

        return {
          id: classData.id,
          label: classData.label,
          grade_level: classData.grade_level,
          school_name: classData.schools?.name,
          rooms: classRooms,
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
