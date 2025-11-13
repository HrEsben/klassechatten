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

export function useUserProfile(classId?: string) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isClassAdmin, setIsClassAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsClassAdmin(false);
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

        // Check if user is a class admin
        // If classId is provided, check for that specific class
        // If not provided, check if user is admin in ANY class
        let query = supabase
          .from('class_members')
          .select('is_class_admin')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('is_class_admin', true);

        if (classId) {
          query = query.eq('class_id', classId);
        }

        const { data: adminData } = await query.limit(1);

        setIsClassAdmin(!!adminData && adminData.length > 0);
      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
        setProfile(null);
        setIsClassAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, classId]);

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
    isClassAdmin,
    roleLabel: getRoleLabel(),
  };
}
