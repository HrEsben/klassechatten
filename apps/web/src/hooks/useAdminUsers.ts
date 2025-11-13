import { useState, useEffect } from 'react';

interface UserWithProfile {
  user_id: string;
  email: string;
  role: 'child' | 'guardian' | 'adult' | 'admin';
  display_name: string;
  avatar_url?: string;
  avatar_color?: string;
  created_at: string;
  last_sign_in_at?: string;
}

interface UserStats {
  totalUsers: number;
  students: number;
  teachers: number;
  parents: number;
  admins: number;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    students: 0,
    teachers: 0,
    parents: 0,
    admins: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch users from API route (server-side)
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const { users: combinedUsers } = await response.json();

      setUsers(combinedUsers);

      // Calculate stats
      const newStats = {
        totalUsers: combinedUsers.length,
        students: combinedUsers.filter((u: UserWithProfile) => u.role === 'child').length,
        teachers: combinedUsers.filter((u: UserWithProfile) => u.role === 'adult').length,
        parents: combinedUsers.filter((u: UserWithProfile) => u.role === 'guardian').length,
        admins: combinedUsers.filter((u: UserWithProfile) => u.role === 'admin').length,
      };
      setStats(newStats);

    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'child':
        return 'Elev';
      case 'guardian':
        return 'Forælder';
      case 'adult':
        return 'Lærer';
      case 'admin':
        return 'Admin';
      default:
        return 'Ukendt';
    }
  };

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'child':
        return 'badge-info';
      case 'guardian':
        return 'badge-secondary';
      case 'adult':
        return 'badge-primary';
      case 'admin':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  return {
    users,
    stats,
    loading,
    error,
    refetch: fetchUsers,
    getRoleLabel,
    getRoleBadgeColor,
  };
}
