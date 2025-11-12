'use client';

import { useState, useEffect, useRef } from 'react';
import { useRoomMessages } from '@/hooks/useRoomMessages';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useRoomPresence } from '@/hooks/useRoomPresence';
import { useReadReceipts } from '@/hooks/useReadReceipts';
import { useAuth } from '@/contexts/AuthContext';
import { getRelativeTime } from '@/lib/time';
import Avatar from './Avatar';
import OnlineUsers from './OnlineUsers';

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
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  
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
  const { onlineUsers, typingUsers, setTyping, onlineCount } = useRoomPresence({
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
      {/* Header */}
      <div className="navbar bg-base-100 shadow-sm border-b border-base-200">
        <div className="navbar-start">
          {onBack && (
            <button
              onClick={onBack}
              className="btn btn-ghost btn-sm"
              title="Tilbage til klasseliste"
            >
              ←
            </button>
          )}
          <h2 className="text-lg font-semibold">#{roomName}</h2>
        </div>
        
        <div className="navbar-end flex items-center gap-3">
          <OnlineUsers users={onlineUsers} maxVisible={4} />
          
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-warning'}`}></div>
            <span className="text-xs text-base-content/70">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>      {/* Messages */}
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
                className={`chat ${isOwnMessage ? 'chat-end' : 'chat-start'}`}
              >
                {/* Avatar - only show for other users */}
                {!isOwnMessage && (
                  <div className="chat-image">
                    <Avatar 
                      user={{
                        display_name: msg.profiles?.display_name || msg.user?.user_metadata?.display_name || msg.user?.email || 'Ukendt bruger',
                        avatar_url: msg.profiles?.avatar_url,
                        avatar_color: msg.profiles?.avatar_color,
                      }}
                      size="sm"
                    />
                  </div>
                )}

                <div className="chat-header text-xs opacity-70">
                  {isOwnMessage ? 'Dig' : (msg.profiles?.display_name || msg.user?.user_metadata?.display_name || msg.user?.email || 'Ukendt bruger')}
                  <time className="ml-1">{getRelativeTime(msg.created_at)}</time>
                  {isOptimistic && (
                    <span className="ml-2">
                      {isLoading ? '⏳ Sender...' : hasError ? '❌ Fejlet' : '✓ Sendt'}
                    </span>
                  )}
                </div>

                <div className={`chat-bubble ${
                  isOwnMessage ? 'chat-bubble-primary' : 'chat-bubble-neutral'
                } ${isOptimistic ? 'opacity-70' : ''} ${hasError ? 'border-2 border-error' : ''}`}>
                  {msg.image_url && (
                    <img 
                      src={msg.image_url} 
                      alt="Uploaded image"
                      onClick={() => setEnlargedImageUrl(msg.image_url || null)}
                      className={`w-32 h-24 object-cover rounded cursor-pointer mb-2 hover:brightness-75 ${
                        isOptimistic && isLoading ? 'opacity-50' : ''
                      }`}
                    />
                  )}
                  {msg.body && <div className="whitespace-pre-wrap">{msg.body}</div>}
                </div>

                <div className="chat-footer">
                  {hasError && (
                    <div className="text-xs text-error italic mt-1">
                      Besked kunne ikke sendes. Prøv igen.
                    </div>
                  )}
                  {msg.edited_at && (
                    <div className="text-xs opacity-70 mt-1">
                      (redigeret)
                    </div>
                  )}
                  {/* Read receipts - only show for own messages and non-optimistic messages */}
                  {isOwnMessage && !isOptimistic && msg.read_receipts && msg.read_receipts.length > 0 && (
                    <div className="text-xs opacity-80 mt-1">
                      ✓✓ Læst af {msg.read_receipts.length}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {/* Jump to Bottom Button */}
        {showScrollToBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            className="btn btn-circle btn-primary fixed bottom-20 right-4 shadow-lg z-10"
            title={unreadCount > 0 ? `${unreadCount} nye beskeder` : 'Gå til bunden'}
          >
            {unreadCount > 0 ? (
              <div className="relative">
                ↓
                <div className="badge badge-error badge-sm absolute -top-2 -right-2">
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
        <div className="px-4 py-2 text-sm text-base-content/70 italic border-t border-base-300 bg-base-100">
          {typingUsers.length === 1
            ? `${typingUsers[0]?.display_name || 'Nogen'} skriver...`
            : typingUsers.length === 2
            ? `${typingUsers[0]?.display_name || 'Nogen'} og ${typingUsers[1]?.display_name || 'nogen'} skriver...`
            : `${typingUsers.length} personer skriver...`}
        </div>
      )}

      {/* Suggestion Dialog */}
      {showSuggestion && (
        <div className="p-4 bg-warning/10 border-t border-warning">
          <p className="font-bold mb-2">
            Din besked blev blokeret
          </p>
          <p className="text-sm text-base-content/70 mb-2">
            Din besked indeholder indhold der kan være upassende. Du kan sende denne omformulering i stedet:
          </p>
          <p className="mb-4 italic">
            &ldquo;{showSuggestion}&rdquo;
          </p>
          <div className="flex gap-2">
            <button 
              onClick={useSuggestion}
              className="btn btn-success btn-sm"
            >
              Send omformulering
            </button>
            <button 
              onClick={cancelMessage}
              className="btn btn-neutral btn-sm"
            >
              Annuller
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-base-300 bg-base-100">
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-2 relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-h-24 rounded-lg"
            />
            <button
              onClick={handleRemoveImage}
              className="btn btn-circle btn-error btn-xs absolute top-1 right-1"
            >
              ×
            </button>
          </div>
        )}
        
        <div className="flex gap-2">
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
            className={`btn btn-square ${(sending || uploading) ? 'btn-disabled' : 'btn-neutral'}`}
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
            className="input input-bordered flex-1"
          />
          <button
            onClick={handleSend}
            disabled={sending || uploading || (!messageText.trim() && !selectedImage)}
            className={`btn ${(sending || uploading || (!messageText.trim() && !selectedImage)) ? 'btn-disabled' : 'btn-primary'}`}
          >
            {uploading ? 'Uploader...' : sending ? 'Sender...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Enlarged Image Modal */}
      {enlargedImageUrl && (
        <div 
          onClick={() => setEnlargedImageUrl(null)}
          className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[90vh] flex justify-center items-center"
          >
            {enlargedImageUrl && (
              <img 
                src={enlargedImageUrl}
                alt="Enlarged view"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
