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
  const { onlineUsers, typingUsers, setTyping } = useRoomPresence({
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
    return (
      <div className="flex justify-center items-center h-full bg-base-100/80">
        <div className="flex flex-col items-center gap-6">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <div className="text-base-content/60 font-light tracking-wide">Indlæser...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full bg-base-100/80">
        <div className="bg-error/10 border border-error/20 px-6 py-4 font-mono text-error text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-base-100/80 backdrop-blur-sm">
      {/* Header */}
      <div className="bg-base-100/60 border-b border-primary/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 flex items-center justify-center text-base-content/60 hover:text-base-content transition-colors duration-200"
                title="Back"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-lg font-light tracking-wide text-base-content">#{roomName}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <OnlineUsers users={onlineUsers} maxVisible={3} />
            
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success' : 'bg-warning'}`}></div>
              <span className="text-xs text-base-content/50 font-mono uppercase tracking-wider">
                {isConnected ? 'Live' : 'Connecting'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-transparent min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-0.5 bg-primary/40 mb-4"></div>
            <p className="text-base-content/50 font-light text-sm tracking-wide">Empty channel</p>
            <p className="text-base-content/30 font-light text-xs mt-1">Be the first to start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.user_id === user?.id;
            const isOptimistic = msg.isOptimistic;
            const isLoading = msg.isLoading;
            const hasError = msg.hasError;

            return (
              <div key={msg.id} className={`chat ${isOwnMessage ? 'chat-end' : 'chat-start'}`}>
                {/* Avatar - show for all messages following DaisyUI pattern */}
                <div className="chat-image avatar">
                  <div className="w-10 rounded-full">
                    <Avatar
                      user={{
                        display_name:
                          isOwnMessage 
                            ? 'Dig'
                            : (msg.profiles?.display_name || msg.user?.user_metadata?.display_name || msg.user?.email || 'Ukendt bruger'),
                        avatar_url: isOwnMessage ? user?.user_metadata?.avatar_url : msg.profiles?.avatar_url,
                        avatar_color: isOwnMessage ? user?.user_metadata?.avatar_color : msg.profiles?.avatar_color,
                      }}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="chat-header">
                  {isOwnMessage ? 'Dig' : (msg.profiles?.display_name || msg.user?.user_metadata?.display_name || msg.user?.email || 'Ukendt bruger')}
                </div>

                <div
                  className={`chat-bubble ${isOwnMessage ? 'chat-bubble-primary' : 'chat-bubble-neutral'} ${
                    isOptimistic ? 'opacity-70' : ''
                  } ${hasError ? 'border-2 border-error' : ''}`}
                >
                  {msg.image_url && (
                    <img
                      src={msg.image_url}
                      alt="Uploaded image"
                      onClick={() => setEnlargedImageUrl(msg.image_url || null)}
                      className={`w-40 h-28 object-cover rounded-lg cursor-pointer mb-2 hover:brightness-90 ${isOptimistic && isLoading ? 'opacity-50' : ''}`}
                    />
                  )}
                  {msg.body && <div className="whitespace-pre-wrap px-1">{msg.body}</div>}
                </div>

                <div className="chat-footer opacity-50">
                  <time className="text-xs">{getRelativeTime(msg.created_at)}</time>
                  {isOptimistic && (
                    <span className="ml-2">{isLoading ? '⏳ Sender...' : hasError ? '❌ Fejlet' : '✓ Sendt'}</span>
                  )}
                  {hasError && (
                    <div className="text-error italic mt-1">Besked kunne ikke sendes. Prøv igen.</div>
                  )}
                  {msg.edited_at && (
                    <div className="ml-2">(redigeret)</div>
                  )}
                  {/* Read receipts - only show for own messages and non-optimistic messages */}
                  {isOwnMessage && !isOptimistic && msg.read_receipts && msg.read_receipts.length > 0 && (
                    <div className="ml-2">✓✓ Læst af {msg.read_receipts.length}</div>
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
            className="fixed bottom-24 right-6 w-10 h-10 bg-primary/90 hover:bg-primary text-primary-content flex items-center justify-center shadow-lg z-10 transition-all duration-200"
            title={unreadCount > 0 ? `${unreadCount} new messages` : 'Jump to bottom'}
          >
            {unreadCount > 0 ? (
              <div className="relative">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-error text-error-content text-xs flex items-center justify-center rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              </div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-xs text-base-content/40 font-mono bg-base-100/30">
          {typingUsers.length === 1
            ? `${typingUsers[0]?.display_name || 'Someone'} typing...`
            : typingUsers.length === 2
            ? `${typingUsers[0]?.display_name || 'Someone'} and ${typingUsers[1]?.display_name || 'someone'} typing...`
            : `${typingUsers.length} people typing...`}
        </div>
      )}

      {/* Suggestion Dialog */}
      {showSuggestion && (
        <div className="px-4 py-4 bg-warning/5 border-t border-warning/20">
          <div className="font-mono text-xs uppercase tracking-wider text-warning mb-3">Message blocked</div>
          <p className="text-sm text-base-content/70 mb-3 font-light">
            Content flagged. Alternative suggestion:
          </p>
          <p className="mb-4 text-base-content/80 bg-base-200/50 p-3 rounded-none border-l-2 border-primary/40">
            {showSuggestion}
          </p>
          <div className="flex gap-3">
            <button 
              onClick={useSuggestion}
              className="px-4 py-2 bg-success/20 text-success text-xs font-mono uppercase tracking-wider hover:bg-success/30 transition-colors duration-200"
            >
              Use
            </button>
            <button 
              onClick={cancelMessage}
              className="px-4 py-2 text-base-content/60 text-xs font-mono uppercase tracking-wider hover:text-base-content transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Input - Always visible at bottom */}
      <div className="sticky bottom-0 px-4 py-4 border-t border-primary/10 bg-base-100/90 backdrop-blur-md">
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-4 relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-h-20 border border-base-300 rounded"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-error text-error-content text-xs flex items-center justify-center hover:bg-error/80 transition-colors duration-200 rounded-full"
            >
              ×
            </button>
          </div>
        )}
        
        <div className="flex gap-3 items-end">
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
            className="btn btn-square btn-ghost btn-sm text-base-content/60 hover:text-base-content"
            title="Upload billede"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input
            type="text"
            value={messageText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Skriv en besked..."
            disabled={sending || uploading}
            className="input input-bordered flex-1 bg-base-100 focus:bg-base-100"
          />
          <button
            onClick={handleSend}
            disabled={sending || uploading || (!messageText.trim() && !selectedImage)}
            className="btn btn-primary btn-sm"
          >
            {uploading ? 'Uploader' : sending ? 'Sender' : 'Send'}
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
