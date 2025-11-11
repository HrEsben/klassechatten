import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabase';

interface SendMessageResult {
  status: 'allow' | 'flag' | 'block' | 'blocked';
  message_id?: number;
  suggested?: string;
  warning?: string;
  reason?: string;
  error?: string;
  optimistic?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
}

export function useSendMessage() {
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (uri: string): Promise<string | null> => {
    setUploading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create unique filename
      const fileExt = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      // Use FormData for React Native compatibility
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: `image/${fileExt}`,
        name: fileName,
      } as any);

      // Upload using fetch directly with FormData
      const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/chat-images/${fileName}`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          // Don't set Content-Type - let the browser/RN set it automatically with boundary
        },
        body: formData as any,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json() as { message?: string };
        throw new Error(error.message || 'Upload failed');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Fejl', 'Kunne ikke uploade billede');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async (source: 'camera' | 'library'): Promise<string | null> => {
    try {
      let result;
      
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Tilladelse nødvendig', 'Kameraadgang er påkrævet');
          return null;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.7,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Tilladelse nødvendig', 'Adgang til billedbibliotek er påkrævet');
          return null;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Fejl', 'Kunne ikke vælge billede');
      return null;
    }
  };

  const sendMessage = async (
    roomId: string, 
    body?: string,
    imageUrl?: string,
    replyTo?: number
  ): Promise<SendMessageResult> => {
    setSending(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create_message`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            room_id: roomId, 
            body: body || null,
            image_url: imageUrl || null,
            reply_to: replyTo 
          }),
        }
      );

      const result = await response.json() as SendMessageResult;
      
      if (!response.ok) {
        console.error('Edge Function error:', result);
        throw new Error(result.error || 'Failed to send message');
      }

      // Handle moderation results
      if (result.status === 'blocked') {
        Alert.alert(
          'Besked blokeret',
          result.reason || 'Din besked indeholder upassende indhold (fx stødende sprog, hadefulde udtryk eller vold) og kan ikke sendes.',
          [{ text: 'OK' }]
        );
        return result;
      } else if (result.status === 'flag' && result.suggested) {
        // Message was NOT sent - suggestion returned instead
        return result;
      }

      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(
        'Fejl',
        'Kunne ikke sende besked. Prøv igen.',
        [{ text: 'OK' }]
      );
      return {
        status: 'block',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setSending(false);
    }
  };

  return { sendMessage, pickImage, uploadImage, sending, uploading };
}
