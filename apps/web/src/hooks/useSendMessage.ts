'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SendMessageResult {
  status: 'allow' | 'flag' | 'flagged' | 'block' | 'blocked' | 'requires_confirmation';
  message_id?: number;
  flagged?: boolean;
  warning?: string;
  reason?: string;
  error?: string;
  original_message?: string;
}

interface OptimisticMessage {
  room_id: string;
  class_id?: string;
  user_id: string;
  body: string | null;
  image_url?: string | null;
  reply_to: number | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  meta?: Record<string, unknown>;
  profiles?: {
    display_name: string;
  };
  user?: {
    id: string;
    email: string;
    user_metadata: { display_name?: string };
  };
}

export function useSendMessage() {
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create unique filename with user ID folder structure
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async (
    roomId: string, 
    body?: string, 
    imageUrl?: string,
    replyTo?: number,
    onOptimisticAdd?: (message: OptimisticMessage) => void,
    onOptimisticUpdate?: (tempId: string, success: boolean) => void
  ): Promise<SendMessageResult> => {
    setSending(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const payload = { 
        room_id: roomId, 
        body: body || null,
        image_url: imageUrl || null,
        reply_to: replyTo
      };
      
      console.log('Sending message payload:', payload);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create_message`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      let result;
      const responseText = await response.text();
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', responseText);
        console.error('HTTP Status:', response.status, response.statusText);
        setSending(false);
        throw new Error(`Invalid response from server: ${responseText.slice(0, 100)}`);
      }
      
      console.log('Edge Function response:', result);
      console.log('HTTP Status:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('Edge Function error:', result);
        console.error('Full response:', response);
        setSending(false);
        throw new Error(result.error || result.reason || 'Failed to send message');
      }

      setSending(false);
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      setSending(false);
      return {
        status: 'blocked' as const,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  return { sendMessage, uploadImage, sending, uploading };
}
