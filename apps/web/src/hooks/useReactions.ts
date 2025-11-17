import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Reaction {
  id: number;
  message_id: number;
  user_id: string;
  emoji: string;
  created_at: string;
  profiles?: {
    display_name: string;
  };
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[]; // Array of user IDs who reacted
  userNames: string[]; // Array of display names
  hasReacted: boolean; // Whether current user has reacted with this emoji
}

interface UseReactionsProps {
  messageId: number;
  currentUserId?: string;
  enabled?: boolean;
}

export function useReactions({ messageId, currentUserId, enabled = true }: UseReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reactionGroups, setReactionGroups] = useState<ReactionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Group reactions by emoji
  const groupReactions = useCallback((reactionsList: Reaction[]) => {
    const groups = new Map<string, ReactionGroup>();
    
    reactionsList.forEach((reaction) => {
      const existing = groups.get(reaction.emoji);
      const displayName = reaction.profiles?.display_name || 'Ukendt bruger';
      
      if (existing) {
        existing.count++;
        existing.users.push(reaction.user_id);
        existing.userNames.push(displayName);
        if (currentUserId && reaction.user_id === currentUserId) {
          existing.hasReacted = true;
        }
      } else {
        groups.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          users: [reaction.user_id],
          userNames: [displayName],
          hasReacted: currentUserId ? reaction.user_id === currentUserId : false,
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [currentUserId]);

  // Fetch reactions for a message
  const fetchReactions = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      // Fetch reactions without join - we'll get display names from profiles table separately if needed
      const { data, error: fetchError } = await supabase
        .from('reactions')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        // Check if table doesn't exist (migration not run)
        if (fetchError.code === 'PGRST204' || fetchError.message?.includes('relation') || fetchError.message?.includes('does not exist')) {
          console.warn('Reactions table does not exist yet. Run migration: supabase/migrations/20241114_add_reactions.sql');
          setReactions([]);
          setReactionGroups([]);
          setError(null);
          return;
        }
        throw fetchError;
      }

      const reactionsData = data || [];
      
      // Fetch user display names for reactions
      if (reactionsData.length > 0) {
        const userIds = [...new Set(reactionsData.map(r => r.user_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }
        
        // Merge display names into reactions
        const profileMap = new Map(profilesData?.map(p => [p.user_id, p.display_name]) || []);
        const reactionsWithProfiles = reactionsData.map(r => ({
          ...r,
          profiles: { display_name: profileMap.get(r.user_id) || 'Ukendt bruger' }
        }));
        
        setReactions(reactionsWithProfiles);
        setReactionGroups(groupReactions(reactionsWithProfiles));
      } else {
        setReactions([]);
        setReactionGroups([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching reactions:', err, {
        messageId,
        errorType: typeof err,
        errorKeys: err ? Object.keys(err) : [],
      });
      setError(err instanceof Error ? err.message : 'Failed to fetch reactions');
    } finally {
      setLoading(false);
    }
  }, [messageId, enabled, groupReactions]);

  // Add a reaction
  const addReaction = useCallback(async (emoji: string) => {
    if (!currentUserId) {
      console.error('Cannot add reaction: user not authenticated');
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('reactions')
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji,
        })
        .select();

      if (insertError) {
        // If duplicate key error, silently ignore (user already has this reaction)
        if (insertError.code === '23505') {
          console.log('Reaction already exists, ignoring duplicate');
          return;
        }
        throw insertError;
      }

      // Refetch to get updated data with profile info
      await fetchReactions();
    } catch (err) {
      console.error('Error adding reaction:', err);
      // Revert optimistic update on error
      await fetchReactions();
    }
  }, [messageId, currentUserId, fetchReactions]);

  // Remove a reaction
  const removeReaction = useCallback(async (emoji: string) => {
    if (!currentUserId) {
      console.error('Cannot remove reaction: user not authenticated');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji);

      if (deleteError) throw deleteError;

      // Optimistic update
      const updatedReactions = reactions.filter(
        (r) => !(r.user_id === currentUserId && r.emoji === emoji)
      );
      setReactions(updatedReactions);
      setReactionGroups(groupReactions(updatedReactions));
    } catch (err) {
      console.error('Error removing reaction:', err);
      // Revert optimistic update on error
      await fetchReactions();
    }
  }, [messageId, currentUserId, reactions, groupReactions, fetchReactions]);

  // Toggle reaction (add if not present, remove if present)
  const toggleReaction = useCallback(async (emoji: string) => {
    const hasReacted = reactions.some(
      (r) => r.user_id === currentUserId && r.emoji === emoji
    );

    if (hasReacted) {
      await removeReaction(emoji);
    } else {
      await addReaction(emoji);
    }
  }, [reactions, currentUserId, addReaction, removeReaction]);

  // Set up realtime subscription for this specific message's reactions
  useEffect(() => {
    if (!enabled) return;

    fetchReactions();

    // Subscribe to reaction changes for this message only
    // Note: We keep per-message subscriptions for reactions because they're component-level,
    // but use a simpler channel naming to allow Supabase to better multiplex connections
    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions',
          filter: `message_id=eq.${messageId}`,
        },
        (payload) => {
          const newReaction = payload.new as Reaction;
          setReactions((prev) => {
            // Avoid duplicates
            if (prev.some((r) => r.id === newReaction.id)) {
              return prev;
            }
            const updated = [...prev, newReaction];
            setReactionGroups(groupReactions(updated));
            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reactions',
          filter: `message_id=eq.${messageId}`,
        },
        (payload) => {
          const deletedReaction = payload.old as Reaction;
          setReactions((prev) => {
            const updated = prev.filter((r) => r.id !== deletedReaction.id);
            setReactionGroups(groupReactions(updated));
            return updated;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [messageId, enabled, fetchReactions, groupReactions]);

  return {
    reactions,
    reactionGroups,
    loading,
    error,
    addReaction,
    removeReaction,
    toggleReaction,
    refresh: fetchReactions,
  };
}
