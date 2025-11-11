'use client';

import { useState, useEffect, useRef } from 'react';
import { useRoomMessages } from '@/hooks/useRoomMessages';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useRoomPresence } from '@/hooks/useRoomPresence';
import { useReadReceipts } from '@/hooks/useReadReceipts';
import { useAuth } from '@/contexts/AuthContext';
import { getRelativeTime } from '@/lib/time';

interface ChatRoomProps {
  roomId: string;
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const [messageText, setMessageText] = useState('');
  const [showSuggestion, setShowSuggestion] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>('Chat Room');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { messages, loading, error, isConnected } = useRoomMessages({ 
    roomId,
    limit: 50 
  });
  
  const { sendMessage, uploadImage, sending, uploading } = useSendMessage();
  
  // Presence and typing indicators
  const { onlineUsers, typingUsers, setTyping, onlineCount } = useRoomPresence({
    roomId,
    userId: user?.id || '',
    displayName: user?.user_metadata?.display_name || user?.email || 'Anonymous',
    enabled: !!user,
  });

  // Read receipts
  useReadReceipts({
    roomId,
    userId: user?.id || '',
    messages: messages.map(m => ({ id: m.id, user_id: m.user_id })),
    enabled: !!user,
  });

  // Fetch room details
  useEffect(() => {
    const fetchRoomDetails = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('rooms')
        .select('name')
        .eq('id', roomId)
        .single();
      
      if (data && !error) {
        setRoomName(data.name);
      }
    };

    fetchRoomDetails();
  }, [roomId]);

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setMessageText(value);

    // Set typing to true
    if (value.length > 0) {
      setTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set typing to false after 2 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 2000);
    } else {
      setTyping(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() && !selectedImage) return;

    // Stop typing indicator
    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    let imageUrl: string | null = null;

    // Upload image if selected
    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
      if (!imageUrl) {
        alert('Kunne ikke uploade billede. Prøv igen.');
        return;
      }
    }

    const result = await sendMessage(roomId, messageText.trim() || undefined, imageUrl || undefined);

    if (result.status === 'block' || result.status === 'blocked') {
      alert(result.reason || 'Din besked blev blokeret på grund af upassende indhold (fx stødende sprog, hadefulde udtryk eller vold).');
      setMessageText('');
      handleRemoveImage();
      return;
    }

    if (result.status === 'flag' && result.suggested) {
      setShowSuggestion(result.suggested);
      return;
    }

    // Clear input on success
    if (result.message_id) {
      setMessageText('');
      setShowSuggestion(null);
      handleRemoveImage();
    }
  };

  const useSuggestion = async () => {
    if (!showSuggestion) return;
    
    // Send the suggested text
    const result = await sendMessage(roomId, showSuggestion);
    
    if (result.message_id) {
      setMessageText('');
      setShowSuggestion(null);
      handleRemoveImage();
    }
  };

  const cancelMessage = () => {
    // Clear everything - user's message was rejected
    setMessageText('');
    setShowSuggestion(null);
    handleRemoveImage();
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading messages...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ 
        padding: '1rem', 
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: '0.25rem' }}>{roomName}</h2>
          <div style={{ fontSize: '0.75rem', color: '#666' }}>
            {onlineCount > 0 && `${onlineCount} online`}
          </div>
        </div>
        <div style={{ 
          fontSize: '0.875rem', 
          color: isConnected ? 'green' : 'orange' 
        }}>
          {isConnected ? '🟢 Connected' : '🟠 Connecting...'}
        </div>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>
            Ingen beskeder endnu. Send den første!
          </p>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.user_id === user?.id;
            return (
              <div 
                key={msg.id}
                style={{
                  padding: '0.75rem',
                  background: isOwnMessage ? '#007bff' : '#f5f5f5',
                  color: isOwnMessage ? 'white' : 'black',
                  borderRadius: '8px',
                  maxWidth: '70%',
                  alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                  marginLeft: isOwnMessage ? 'auto' : '0',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem', opacity: isOwnMessage ? 0.9 : 1 }}>
                  {isOwnMessage ? 'Dig' : (msg.profiles?.display_name || 'Ukendt bruger')}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>
                  {getRelativeTime(msg.created_at)}
                </div>
                {msg.image_url && (
                  <img 
                    src={msg.image_url} 
                    alt="Uploaded image"
                    style={{ 
                      maxWidth: '100%', 
                      borderRadius: '8px', 
                      marginBottom: msg.body ? '0.5rem' : '0' 
                    }}
                  />
                )}
                {msg.body && <div>{msg.body}</div>}
                {msg.edited_at && (
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
                    (redigeret)
                  </div>
                )}
                {/* Read receipts - only show for own messages */}
                {isOwnMessage && msg.read_receipts && msg.read_receipts.length > 0 && (
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                    ✓✓ Læst af {msg.read_receipts.length}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div style={{
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          color: '#666',
          fontStyle: 'italic',
          borderTop: '1px solid #f0f0f0'
        }}>
          {typingUsers.length === 1
            ? `${typingUsers[0]?.display_name || 'Nogen'} skriver...`
            : typingUsers.length === 2
            ? `${typingUsers[0]?.display_name || 'Nogen'} og ${typingUsers[1]?.display_name || 'nogen'} skriver...`
            : `${typingUsers.length} personer skriver...`}
        </div>
      )}

      {/* Suggestion Dialog */}
      {showSuggestion && (
        <div style={{
          padding: '1rem',
          background: '#fff3cd',
          borderTop: '1px solid #ffc107'
        }}>
          <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Din besked blev blokeret
          </p>
          <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
            Din besked indeholder indhold der kan være upassende. Du kan sende denne omformulering i stedet:
          </p>
          <p style={{ marginBottom: '1rem', fontStyle: 'italic' }}>
            &ldquo;{showSuggestion}&rdquo;
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={useSuggestion}
              style={{
                padding: '0.5rem 1rem',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Send omformulering
            </button>
            <button 
              onClick={cancelMessage}
              style={{
                padding: '0.5rem 1rem',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Annuller
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ 
        padding: '1rem', 
        borderTop: '1px solid #eee',
      }}>
        {/* Image Preview */}
        {imagePreview && (
          <div style={{ marginBottom: '0.5rem', position: 'relative', display: 'inline-block' }}>
            <img 
              src={imagePreview} 
              alt="Preview" 
              style={{ maxHeight: '100px', borderRadius: '8px' }}
            />
            <button
              onClick={handleRemoveImage}
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploading}
            style={{
              padding: '0.75rem',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (sending || uploading) ? 'not-allowed' : 'pointer',
              fontSize: '1.2rem'
            }}
            title="Upload billede"
          >
            📷
          </button>
          <input
            type="text"
            value={messageText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Skriv en besked..."
            disabled={sending || uploading}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || uploading || (!messageText.trim() && !selectedImage)}
            style={{
              padding: '0.75rem 1.5rem',
              background: (sending || uploading) ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (sending || uploading) ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {uploading ? 'Uploader...' : sending ? 'Sender...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
