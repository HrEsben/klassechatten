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

interface UseRoomReactionsOptions {
  roomId: string;
  currentUserId?: string;
  enabled?: boolean;
}

export function useRoomReactions({ 
  roomId, 
  currentUserId,
  enabled = true 
}: UseRoomReactionsOptions) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch initial reactions for all messages in the room
  const fetchReactions = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      
      // Get all message IDs for this room first
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .eq('room_id', roomId);

      if (messagesError) throw messagesError;

      if (!messages || messages.length === 0) {
        setReactions([]);
        setLoading(false);
        return;
      }

      const messageIds = messages.map(m => m.id);

      // Fetch all reactions for these messages
      const { data, error: fetchError } = await supabase
        .from('reactions')
        .select('*')
        .in('message_id', messageIds)
        .order('created_at', { ascending: true });

      if (fetchError) {
        if (fetchError.code === 'PGRST204' || fetchError.message?.includes('relation') || fetchError.message?.includes('does not exist')) {
          console.warn('Reactions table does not exist yet.');
          setReactions([]);
          setError(null);
          return;
        }
        throw fetchError;
      }

      setReactions(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching reactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reactions');
    } finally {
      setLoading(false);
    }
  }, [roomId, enabled]);

  // Add reaction optimistically
  const addReaction = useCallback(async (messageId: number, emoji: string) => {
    if (!currentUserId) {
      console.error('Cannot add reaction: user not authenticated');
      return;
    }

    console.log(`➕ Adding reaction ${emoji} to message ${messageId}`);

    // Optimistic update
    const optimisticReaction: Reaction = {
      id: Date.now(),
      message_id: messageId,
      user_id: currentUserId,
      emoji,
      created_at: new Date().toISOString(),
    };
    
    setReactions(prev => [...prev, optimisticReaction]);

    try {
      const { error: insertError } = await supabase
        .from('reactions')
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji,
        });

      if (insertError) throw insertError;
      
      console.log('✅ Reaction added to database');
    } catch (err) {
      console.error('❌ Error adding reaction:', err);
      // Revert optimistic update
      setReactions(prev => prev.filter(r => r.id !== optimisticReaction.id));
      await fetchReactions();
    }
  }, [currentUserId, fetchReactions]);

  // Remove reaction optimistically
  const removeReaction = useCallback(async (messageId: number, emoji: string) => {
    if (!currentUserId) {
      console.error('Cannot remove reaction: user not authenticated');
      return;
    }

    console.log(`➖ Removing reaction ${emoji} from message ${messageId}`);

    // Find the reaction to remove
    const reactionToRemove = reactions.find(
      r => r.message_id === messageId && r.user_id === currentUserId && r.emoji === emoji
    );

    if (!reactionToRemove) return;

    // Optimistic update
    setReactions(prev => prev.filter(r => r.id !== reactionToRemove.id));

    try {
      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji);

      if (deleteError) throw deleteError;

      console.log('✅ Reaction removed from database');
    } catch (err) {
      console.error('❌ Error removing reaction:', err);
      // Revert optimistic update
      setReactions(prev => [...prev, reactionToRemove]);
      await fetchReactions();
    }
  }, [currentUserId, reactions, fetchReactions]);

  // Toggle reaction
  const toggleReaction = useCallback(async (messageId: number, emoji: string) => {
    const hasReacted = reactions.some(
      r => r.message_id === messageId && r.user_id === currentUserId && r.emoji === emoji
    );

    if (hasReacted) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  }, [reactions, currentUserId, addReaction, removeReaction]);

  // Get reactions for a specific message
  const getReactionsForMessage = useCallback((messageId: number): ReactionGroup[] => {
    const messageReactions = reactions.filter(r => r.message_id === messageId);
    const groups = new Map<string, ReactionGroup>();
    
    messageReactions.forEach((reaction) => {
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
  }, [reactions, currentUserId]);

  // Subscribe to realtime updates for ALL reactions in the room
  useEffect(() => {
    if (!enabled) return;

    console.log(`🔧 Setting up room-level reactions subscription for room ${roomId}`);

    fetchReactions();

    const channel = supabase
      .channel(`reactions:room.${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions',
        },
        async (payload) => {
          console.log('🎉 Reaction INSERT event received:', payload);
          const newReaction = payload.new as Reaction;
          
          // Verify this reaction belongs to this room by checking if message exists
          const { data: message } = await supabase
            .from('messages')
            .select('room_id')
            .eq('id', newReaction.message_id)
            .single();

          if (message?.room_id !== roomId) {
            console.log('⚠️ Reaction not for this room, ignoring');
            return;
          }
          
          setReactions((prev) => {
            // Check for duplicate by content
            const exists = prev.some((r) => 
              r.message_id === newReaction.message_id &&
              r.user_id === newReaction.user_id &&
              r.emoji === newReaction.emoji
            );
            
            if (exists) {
              console.log('⚠️ Duplicate reaction (replacing optimistic with real)');
              return prev.map((r) =>
                r.message_id === newReaction.message_id &&
                r.user_id === newReaction.user_id &&
                r.emoji === newReaction.emoji
                  ? newReaction
                  : r
              );
            }
            
            console.log('✅ Adding new reaction to state');
            return [...prev, newReaction];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reactions',
        },
        (payload) => {
          console.log('🗑️ Reaction DELETE event received:', payload);
          const deletedReaction = payload.old as Reaction;
          setReactions((prev) => prev.filter((r) => r.id !== deletedReaction.id));
        }
      )
      .subscribe((status) => {
        console.log(`📡 Room reactions subscription status:`, status);
      });

    channelRef.current = channel;

    return () => {
      console.log(`🔌 Unsubscribing from room reactions channel`);
      channel.unsubscribe();
    };
  }, [roomId, enabled, fetchReactions]);

  return {
    reactions,
    loading,
    error,
    addReaction,
    removeReaction,
    toggleReaction,
    getReactionsForMessage,
    refresh: fetchReactions,
  };
}
