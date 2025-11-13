import { useState, useEffect } from 'react';

interface ClassMember {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  avatar_color?: string;
  role_in_class: 'child' | 'guardian' | 'adult';
  profile_role: string;
  joined_at: string;
  status: string;
  guardians?: ClassMember[]; // For students, list of their guardians
}

interface ClassRoom {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

interface ClassDetails {
  id: string;
  label: string;
  grade_level: number;
  invite_code: string;
  created_at: string;
  school_name?: string;
}

export function useClassDetails(classId: string) {
  const [classData, setClassData] = useState<ClassDetails | null>(null);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [rooms, setRooms] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (classId) {
      fetchClassDetails();
    }
  }, [classId]);

  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/classes/${classId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch class details');
      }

      const data = await response.json();
      setClassData(data.class);
      setMembers(data.members || []);
      setRooms(data.rooms || []);

    } catch (err) {
      console.error('Error fetching class details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch class details');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/classes/${classId}/members/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove member');
      }

      await fetchClassDetails();
      return { success: true };
    } catch (err) {
      console.error('Error removing member:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to remove member' 
      };
    }
  };

  const addMember = async (
    email: string, 
    roleInClass: 'child' | 'guardian' | 'adult',
    displayName?: string,
    parentId?: string
  ) => {
    try {
      const response = await fetch(`/api/admin/classes/${classId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          role_in_class: roleInClass,
          display_name: displayName,
          parent_id: parentId
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add member');
      }

      await fetchClassDetails();
      return { success: true };
    } catch (err) {
      console.error('Error adding member:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to add member' 
      };
    }
  };

  return {
    classData,
    members,
    rooms,
    loading,
    error,
    refetch: fetchClassDetails,
    removeMember,
    addMember,
  };
}
