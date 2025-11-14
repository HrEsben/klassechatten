import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Reaction {
  id: number;
  message_id: number;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
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

  const groupReactions = useCallback((reactionsList: Reaction[]) => {
    const groups = new Map<string, ReactionGroup>();
    
    reactionsList.forEach((reaction) => {
      const existing = groups.get(reaction.emoji);
      if (existing) {
        existing.count++;
        existing.users.push(reaction.user_id);
        if (currentUserId && reaction.user_id === currentUserId) {
          existing.hasReacted = true;
        }
      } else {
        groups.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          users: [reaction.user_id],
          hasReacted: currentUserId ? reaction.user_id === currentUserId : false,
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [currentUserId]);

  const fetchReactions = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
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
      setReactions(reactionsData);
      setReactionGroups(groupReactions(reactionsData));
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
        });

      if (insertError) throw insertError;
      
      const newReaction: Reaction = {
        id: Date.now(),
        message_id: messageId,
        user_id: currentUserId,
        emoji,
        created_at: new Date().toISOString(),
      };
      
      const updatedReactions = [...reactions, newReaction];
      setReactions(updatedReactions);
      setReactionGroups(groupReactions(updatedReactions));
    } catch (err) {
      console.error('Error adding reaction:', err);
      await fetchReactions();
    }
  }, [messageId, currentUserId, reactions, groupReactions, fetchReactions]);

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

      const updatedReactions = reactions.filter(
        (r) => !(r.user_id === currentUserId && r.emoji === emoji)
      );
      setReactions(updatedReactions);
      setReactionGroups(groupReactions(updatedReactions));
    } catch (err) {
      console.error('Error removing reaction:', err);
      await fetchReactions();
    }
  }, [messageId, currentUserId, reactions, groupReactions, fetchReactions]);

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

  useEffect(() => {
    if (!enabled) return;

    fetchReactions();

    const channel = supabase
      .channel(`reactions:message_id=eq.${messageId}`)
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
