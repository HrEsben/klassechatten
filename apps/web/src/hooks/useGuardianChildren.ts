import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface GuardianChild {
  child_id: string;
  child_display_name: string;
  child_username: string | null;
  child_avatar_url: string | null;
  relationship: string;
  guardian_count: number;
  invite_code: string | null;
  code_used: boolean;
}

export function useGuardianChildren() {
  const { user } = useAuth();
  const [children, setChildren] = useState<GuardianChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChildren() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/guardians/my-children');
        
        if (!response.ok) {
          throw new Error('Failed to fetch children');
        }

        const data = await response.json();
        setChildren(data.children || []);
      } catch (err) {
        console.error('Error fetching guardian children:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchChildren();
  }, [user]);

  return { children, loading, error, hasChildren: children.length > 0 };
}
