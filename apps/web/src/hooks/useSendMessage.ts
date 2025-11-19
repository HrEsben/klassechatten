'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';
import { performanceMonitor } from '@/lib/performance';

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

  const uploadImage = async (
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<{ url: string | null; thumbnail: string | null }> => {
    setUploading(true);
    
    // Start performance timers
    const compressionId = `image_compression_${Date.now()}`;
    const uploadId = `image_upload_${Date.now()}`;
    performanceMonitor.startTimer(compressionId);
    performanceMonitor.startTimer(uploadId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Compress main image
      if (onProgress) onProgress(10);
      
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.85,
        onProgress: (p) => {
          if (onProgress) onProgress(10 + (p * 0.4)); // 10-50%
        }
      });

      if (onProgress) onProgress(50);

      // Generate thumbnail
      const thumbnailFile = await imageCompression(file, {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 320,
        useWebWorker: true,
        initialQuality: 0.7,
      });

      // End compression timer
      performanceMonitor.endTimer(compressionId, 'image_compression', {
        success: true,
        metadata: {
          originalSize: file.size,
          compressedSize: compressedFile.size,
          thumbnailSize: thumbnailFile.size,
          compressionRatio: (file.size / compressedFile.size).toFixed(2)
        }
      });

      if (onProgress) onProgress(60);

      // Upload main image
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const mainFileName = `${session.user.id}/${timestamp}.${fileExt}`;

      const { data: mainData, error: mainError } = await supabase.storage
        .from('chat-images')
        .upload(mainFileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (mainError) throw mainError;
      if (onProgress) onProgress(80);

      // Upload thumbnail
      const thumbFileName = `${session.user.id}/${timestamp}_thumb.${fileExt}`;

      const { data: thumbData, error: thumbError } = await supabase.storage
        .from('chat-images')
        .upload(thumbFileName, thumbnailFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (thumbError) {
        console.warn('Thumbnail upload failed:', thumbError);
      }

      if (onProgress) onProgress(95);

      // Get public URLs
      const { data: { publicUrl: mainUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(mainData.path);

      const thumbnailUrl = thumbData ? 
        supabase.storage.from('chat-images').getPublicUrl(thumbData.path).data.publicUrl : 
        null;

      if (onProgress) onProgress(100);

      // End upload timer
      performanceMonitor.endTimer(uploadId, 'image_upload', {
        success: true,
        metadata: {
          fileSize: file.size,
          hasThumbnail: !!thumbnailUrl
        }
      });

      return { 
        url: mainUrl, 
        thumbnail: thumbnailUrl 
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      // End timers with failure
      performanceMonitor.endTimer(compressionId, 'image_compression', { success: false });
      performanceMonitor.endTimer(uploadId, 'image_upload', { success: false });
      return { url: null, thumbnail: null };
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async (
    roomId: string, 
    body?: string, 
    imageUrl?: string,
    replyTo?: number,
    tempId?: string, // Add tempId parameter
    onOptimisticUpdate?: (tempId: string, success: boolean) => void
  ): Promise<SendMessageResult> => {
    setSending(true);
    
    // Start performance timer
    const perfId = `message_send_${Date.now()}`;
    performanceMonitor.startTimer(perfId);
    
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
      
      if (!response.ok) {
        console.error('Edge Function error:', result);
        setSending(false);
        // End performance timer (failure)
        performanceMonitor.endTimer(perfId, 'message_send', { success: false });
        // Call callback with failure
        if (onOptimisticUpdate && tempId) {
          onOptimisticUpdate(tempId, false);
        }
        throw new Error(result.error || result.reason || 'Failed to send message');
      }

      // End performance timer (success)
      // Track flagged messages separately
      const wasFlagged = result.status === 'flag' || result.status === 'flagged';
      performanceMonitor.endTimer(perfId, 'message_send', { 
        success: true,
        metadata: { 
          hasImage: !!imageUrl, 
          hasReply: !!replyTo,
          bodyLength: body?.length || 0,
          wasFlagged: wasFlagged,
          status: result.status
        }
      });

      // Call callback with success
      if (onOptimisticUpdate && tempId) {
        onOptimisticUpdate(tempId, true);
      }

      setSending(false);
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      setSending(false);
      // End performance timer (failure)
      performanceMonitor.endTimer(perfId, 'message_send', { success: false });
      // Call callback with failure
      if (onOptimisticUpdate && tempId) {
        onOptimisticUpdate(tempId, false);
      }
      return {
        status: 'blocked' as const,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  return { sendMessage, uploadImage, sending, uploading };
}
