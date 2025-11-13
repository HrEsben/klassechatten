import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  user_id: string;
  role: 'child' | 'guardian' | 'adult' | 'admin';
  display_name: string;
  avatar_url?: string;
  avatar_color?: string;
  created_at: string;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Helper function to get Danish role label
  const getRoleLabel = (): string => {
    if (!profile) return 'Bruger';
    
    switch (profile.role) {
      case 'child':
        return 'Elev';
      case 'guardian':
        return 'Forælder';
      case 'adult':
        return 'Lærer';
      case 'admin':
        return 'Admin';
      default:
        return 'Bruger';
    }
  };

  return {
    profile,
    loading,
    roleLabel: getRoleLabel(),
  };
}
