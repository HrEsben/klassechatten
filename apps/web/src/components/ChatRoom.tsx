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
  onBack?: () => void;
}

export default function ChatRoom({ roomId, onBack }: ChatRoomProps) {
  const [messageText, setMessageText] = useState('');
  const [showSuggestion, setShowSuggestion] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>('Chat Room');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);
  
  const { user } = useAuth();
  const { 
    messages, 
    loading, 
    error, 
    isConnected, 
    addOptimisticMessage, 
    updateOptimisticMessage 
  } = useRoomMessages({ 
    roomId,
    limit: 50 
  });
  
  const { sendMessage, uploadImage, sending, uploading } = useSendMessage();
  
  // Presence and typing indicators
  const { typingUsers, setTyping, onlineCount } = useRoomPresence({
    roomId,
    userId: user?.id || '',
    displayName: user?.user_metadata?.display_name || user?.email || 'Anonymous',
    enabled: !!user,
  });

    // Read receipts
  useReadReceipts({
    userId: user?.id || '',
    messages: messages
      .filter(msg => !msg.isOptimistic)
      .map(msg => ({ id: msg.id as number, user_id: msg.user_id }))
  });

  // Scroll detection and management
  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 50; // pixels from bottom
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    
    setIsAtBottom(atBottom);
    return atBottom;
  };

  const scrollToBottom = (smooth = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
      setIsAtBottom(true);
      setUnreadCount(0);
      setShowScrollToBottom(false);
    }
  };

  const handleScroll = () => {
    const atBottom = checkIfAtBottom();
    if (atBottom) {
      setUnreadCount(0);
      setShowScrollToBottom(false);
    }
  };

  // Auto-scroll logic when new messages arrive
  useEffect(() => {
    const newMessageCount = messages.length;
    const hadNewMessages = newMessageCount > previousMessageCountRef.current;
    
    if (hadNewMessages) {
      if (isAtBottom) {
        // Auto-scroll if user is at bottom
        setTimeout(() => scrollToBottom(false), 100);
      } else {
        // Show notification if user is scrolled up
        const newMessagesAdded = newMessageCount - previousMessageCountRef.current;
        setUnreadCount(prev => prev + newMessagesAdded);
        setShowScrollToBottom(true);
      }
    }
    
    previousMessageCountRef.current = newMessageCount;
  }, [messages.length, isAtBottom]);

  // Initial scroll to bottom when messages first load
  useEffect(() => {
    if (messages.length > 0 && previousMessageCountRef.current === 0) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [messages.length]);

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
    if (file) {
      // Check if it's a supported image format
      const isImage = file.type.startsWith('image/');
      const isHEIC = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
      
      if (isImage || isHEIC) {
        setSelectedImage(file);
        
        // For HEIC files, we'll show a placeholder since browsers can't preview them
        if (isHEIC) {
          // Create a placeholder preview for HEIC files
          setImagePreview('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNHB4IiBmaWxsPSIjNjY2Ij5IRUlDIEJpbGxlZGU8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIwLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEycHgiIGZpbGw9IiM5OTkiPvCfk7ggS2xhciB0aWwgdXBsb2FkPC90ZXh0Pjwvc3ZnPg==');
        } else {
          // For regular images, show preview
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      } else {
        alert('Kun billedfiler er tilladt (JPG, PNG, HEIC, etc.)');
      }
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

    const result = await sendMessage(
      roomId, 
      messageText.trim() || undefined, 
      imageUrl || undefined,
      undefined, // replyTo
      (message) => { 
        addOptimisticMessage(message);
        // Clear input immediately after optimistic message is added
        setMessageText('');
        handleRemoveImage();
        // Always scroll to bottom when sending a message
        setTimeout(() => scrollToBottom(false), 50);
      },
      updateOptimisticMessage
    );

    if (result.status === 'block' || result.status === 'blocked') {
      alert(result.reason || 'Din besked blev blokeret på grund af upassende indhold (fx stødende sprog, hadefulde udtryk eller vold).');
      return;
    }

    if (result.status === 'flag' && result.suggested) {
      setShowSuggestion(result.suggested);
      return;
    }

    // Clear suggestion if message was successful
    if (result.message_id) {
      setShowSuggestion(null);
    }
  };

  const useSuggestion = async () => {
    if (!showSuggestion) return;
    
    // Send the suggested text
    await sendMessage(
      roomId, 
      showSuggestion, 
      undefined, // imageUrl
      undefined, // replyTo
      (message) => { 
        addOptimisticMessage(message);
        // Clear input and suggestion immediately after optimistic message is added
        setShowSuggestion(null);
        handleRemoveImage();
        // Always scroll to bottom when sending a message
        setTimeout(() => scrollToBottom(false), 50);
      },
      updateOptimisticMessage
    );
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
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Consolidated Header */}
      <div style={{ 
        padding: '1rem', 
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        background: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#007bff',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Tilbage til klasseliste"
            >
              ←
            </button>
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>#{roomName}</h2>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onlineCount > 0 && (
            <>
              <span style={{ fontSize: '0.875rem', color: '#666' }}>
                {onlineCount} online
              </span>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#28a745'
              }} />
            </>
          )}
          <div style={{ 
            fontSize: '0.875rem', 
            color: isConnected ? 'green' : 'orange',
            marginLeft: '0.5rem'
          }}>
            {isConnected ? '🟢' : '🟠'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          position: 'relative'
        }}
      >
        {messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>
            Ingen beskeder endnu. Send den første!
          </p>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.user_id === user?.id;
            const isOptimistic = msg.isOptimistic;
            const isLoading = msg.isLoading;
            const hasError = msg.hasError;
            
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
                  opacity: isOptimistic ? 0.7 : 1,
                  border: hasError ? '2px solid red' : undefined,
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem', opacity: isOwnMessage ? 0.9 : 1 }}>
                  {isOwnMessage ? 'Dig' : (msg.profiles?.display_name || msg.user?.user_metadata?.display_name || msg.user?.email || 'Ukendt bruger')}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>
                  {getRelativeTime(msg.created_at)}
                  {isOptimistic && (
                    <span style={{ marginLeft: '0.5rem' }}>
                      {isLoading ? '⏳ Sender...' : hasError ? '❌ Fejlet' : '✓ Sendt'}
                    </span>
                  )}
                </div>
                {msg.image_url && (
                  <img 
                    src={msg.image_url} 
                    alt="Uploaded image"
                    style={{ 
                      maxWidth: '100%', 
                      borderRadius: '8px', 
                      marginBottom: msg.body ? '0.5rem' : '0',
                      opacity: isOptimistic && isLoading ? 0.5 : 1
                    }}
                  />
                )}
                {msg.body && <div>{msg.body}</div>}
                {hasError && (
                  <div style={{ 
                    fontSize: '0.75rem',
                    color: isOwnMessage ? '#ffcccc' : '#ff0000',
                    marginTop: '0.5rem',
                    fontStyle: 'italic'
                  }}>
                    Besked kunne ikke sendes. Prøv igen.
                  </div>
                )}
                {msg.edited_at && (
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
                    (redigeret)
                  </div>
                )}
                {/* Read receipts - only show for own messages and non-optimistic messages */}
                {isOwnMessage && !isOptimistic && msg.read_receipts && msg.read_receipts.length > 0 && (
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                    ✓✓ Læst af {msg.read_receipts.length}
                  </div>
                )}
              </div>
            );
          })
        )}
        
        {/* Jump to Bottom Button */}
        {showScrollToBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            style={{
              position: 'absolute',
              bottom: '1rem',
              right: '1rem',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#007bff',
              color: 'white',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              zIndex: 10
            }}
            title={unreadCount > 0 ? `${unreadCount} nye beskeder` : 'Gå til bunden'}
          >
            {unreadCount > 0 ? (
              <div style={{ position: 'relative' }}>
                ↓
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#ff4757',
                  color: 'white',
                  borderRadius: '10px',
                  minWidth: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              </div>
            ) : (
              '↓'
            )}
          </button>
        )}
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div style={{
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          color: '#666',
          fontStyle: 'italic',
          borderTop: '1px solid #f0f0f0',
          background: 'white',
          flexShrink: 0
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
          borderTop: '1px solid #ffc107',
          flexShrink: 0
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
        background: 'white',
        flexShrink: 0
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
            accept="image/*,.heic,.heif"
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
