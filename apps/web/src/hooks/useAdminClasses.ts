import { useState, useEffect } from 'react';

interface ClassWithDetails {
  id: string;
  label: string;
  grade_level: number;
  school_name?: string;
  invite_code: string;
  created_at: string;
  member_count: number;
  student_count: number;
  teacher_count: number;
  parent_count: number;
  room_count: number;
}

interface ClassStats {
  totalClasses: number;
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalRooms: number;
}

export function useAdminClasses() {
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [stats, setStats] = useState<ClassStats>({
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalRooms: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch classes from API route (server-side)
      const response = await fetch('/api/admin/classes');
      
      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }

      const { classes: fetchedClasses } = await response.json();

      setClasses(fetchedClasses);

      // Calculate stats
      const newStats = {
        totalClasses: fetchedClasses.length,
        totalStudents: fetchedClasses.reduce((sum: number, c: ClassWithDetails) => sum + c.student_count, 0),
        totalTeachers: fetchedClasses.reduce((sum: number, c: ClassWithDetails) => sum + c.teacher_count, 0),
        totalParents: fetchedClasses.reduce((sum: number, c: ClassWithDetails) => sum + c.parent_count, 0),
        totalRooms: fetchedClasses.reduce((sum: number, c: ClassWithDetails) => sum + c.room_count, 0),
      };
      setStats(newStats);

    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const deleteClass = async (classId: string) => {
    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete class');
      }

      // Refresh classes list
      await fetchClasses();
      return { success: true };
    } catch (err) {
      console.error('Error deleting class:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete class' 
      };
    }
  };

  return {
    classes,
    stats,
    loading,
    error,
    refetch: fetchClasses,
    deleteClass,
  };
}
