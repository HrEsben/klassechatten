'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  in_app_enabled: boolean;
  notify_new_messages: boolean;
  notify_mentions: boolean;
  notify_reactions: boolean;
  notify_system: boolean;
  notify_moderation: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  max_notifications_per_hour: number;
  muted_rooms: string[];
  muted_classes: string[];
  created_at: string;
  updated_at: string;
}

interface UpdatePreferencesRequest {
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  notify_new_messages?: boolean;
  notify_mentions?: boolean;
  notify_reactions?: boolean;
  notify_system?: boolean;
  notify_moderation?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  max_notifications_per_hour?: number;
  muted_rooms?: string[];
  muted_classes?: string[];
}

interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: Error | null;
  updatePreferences: (updates: UpdatePreferencesRequest) => Promise<void>;
  toggleMuteRoom: (roomId: string) => Promise<void>;
  toggleMuteClass: (classId: string) => Promise<void>;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If no preferences exist, create default ones
        if (fetchError.code === 'PGRST116') {
          const { data: newPrefs, error: insertError } = await supabase
            .from('notification_preferences')
            .insert({
              user_id: user.id,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          setPreferences(newPrefs);
        } else {
          throw fetchError;
        }
      } else {
        setPreferences(data);
      }
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch preferences'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Update preferences
  const updatePreferences = useCallback(
    async (updates: UpdatePreferencesRequest) => {
      if (!user || !preferences) return;

      try {
        const { data, error: updateError } = await supabase
          .from('notification_preferences')
          .update(updates)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setPreferences(data);
      } catch (err) {
        console.error('Error updating preferences:', err);
        throw err;
      }
    },
    [user, preferences]
  );

  // Toggle mute room
  const toggleMuteRoom = useCallback(
    async (roomId: string) => {
      if (!user || !preferences) return;

      const mutedRooms = preferences.muted_rooms || [];
      const newMutedRooms = mutedRooms.includes(roomId)
        ? mutedRooms.filter((id) => id !== roomId)
        : [...mutedRooms, roomId];

      await updatePreferences({ muted_rooms: newMutedRooms });
    },
    [user, preferences, updatePreferences]
  );

  // Toggle mute class
  const toggleMuteClass = useCallback(
    async (classId: string) => {
      if (!user || !preferences) return;

      const mutedClasses = preferences.muted_classes || [];
      const newMutedClasses = mutedClasses.includes(classId)
        ? mutedClasses.filter((id) => id !== classId)
        : [...mutedClasses, classId];

      await updatePreferences({ muted_classes: newMutedClasses });
    },
    [user, preferences, updatePreferences]
  );

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    toggleMuteRoom,
    toggleMuteClass,
  };
}
