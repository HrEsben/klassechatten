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
import UsersSidebar from './UsersSidebar';
import { ConnectionStatus } from './ConnectionStatus';
import Message from './Message';

interface ChatRoomProps {
  roomId: string;
  onBack?: () => void;
}

export default function ChatRoom({ roomId, onBack }: ChatRoomProps) {
  const [messageText, setMessageText] = useState('');
  const [showSuggestion, setShowSuggestion] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'error' | 'warning' | 'success' | 'info', message: string, blockedText?: string } | null>(null);
  const [roomName, setRoomName] = useState<string>('Chat Room');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  const [lastReadMessageId, setLastReadMessageId] = useState<number | null>(null);
  const [hasScrolledToLastRead, setHasScrolledToLastRead] = useState(false);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const previousMessageCountRef = useRef(0);

  // Handle ESC key to close lightbox
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && enlargedImageUrl) {
        setEnlargedImageUrl(null);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [enlargedImageUrl]);
  
  const { user } = useAuth();
  const { 
    messages, 
    loading, 
    error,
    isConnected,
    isReconnecting,
    refresh,
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

  // TODO: Implement smart pagination-based scrolling (see SMART_SCROLLING.md)
  // For now, always scroll to bottom when entering a room
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToLastRead) {
      setTimeout(() => {
        scrollToBottom(false);
        setHasScrolledToLastRead(true);
      }, 100);
    }
  }, [messages.length, hasScrolledToLastRead]);

  // Reset scroll state when room changes
  useEffect(() => {
    setHasScrolledToLastRead(false);
    setLastReadMessageId(null);
    messageRefs.current.clear();
  }, [roomId]);

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
        // Update page title
        document.title = `# ${data.name} - KlasseChat`;
      }
    };

    fetchRoomDetails();
    
    // Reset title when leaving room
    return () => {
      document.title = 'KlasseChat';
    };
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
        setAlertMessage({
          type: 'warning',
          message: 'Kun billedfiler er tilladt (JPG, PNG, HEIC, etc.)'
        });
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
        setAlertMessage({
          type: 'error',
          message: 'Kunne ikke uploade billede. Prøv igen.'
        });
        return;
      }
    }

    // Track the tempId for potential removal if blocked
    let optimisticMessageId: string | undefined;

    const result = await sendMessage(
      roomId, 
      messageText.trim() || undefined, 
      imageUrl || undefined,
      undefined, // replyTo
      (message) => { 
        optimisticMessageId = addOptimisticMessage(message);
        // Clear input immediately after optimistic message is added
        setMessageText('');
        handleRemoveImage();
        // Always scroll to bottom when sending a message
        setTimeout(() => scrollToBottom(false), 50);
      },
      updateOptimisticMessage
    );

    if (result.status === 'block' || result.status === 'blocked') {
      // Remove the optimistic message from UI
      if (optimisticMessageId) {
        updateOptimisticMessage(optimisticMessageId, true); // true = remove message
      }
      setAlertMessage({
        type: 'error',
        message: 'Din besked blev blokeret på grund af upassende indhold',
        blockedText: messageText.trim()
      });
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
    <div className="drawer lg:drawer-open flex h-full">
      <input id="users-drawer" type="checkbox" className="drawer-toggle" />
      
      {/* Sidebar - now on the left */}
      <div className="drawer-side z-40">
        <label htmlFor="users-drawer" aria-label="luk sidebaren" className="drawer-overlay"></label>
        <UsersSidebar 
          users={onlineUsers} 
          currentUserId={user?.id}
          className="w-64 min-h-full mt-18 lg:mt-0 border-t-0"
        />
      </div>

      {/* Main Content */}
      <div className="drawer-content flex flex-col flex-1 min-w-0 bg-base-100/80 backdrop-blur-sm">
        {/* Header - fixed height to match sidebar header */}
        <div className="flex-none bg-base-100/60 border-b border-primary/10 px-4 h-[57px] flex items-center">
          <div className="flex items-center gap-4">
            {/* Sidebar toggle for mobile */}
            <label htmlFor="users-drawer" className="btn btn-square btn-ghost btn-sm lg:hidden text-base-content">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
            
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 flex items-center justify-center text-base-content/60 hover:text-base-content transition-colors duration-200"
                title="Tilbage"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-lg font-light tracking-wide text-base-content">#{roomName}</h2>
            </div>
            
            {/* DEV: Flush all messages button */}
            <button
              onClick={async () => {
                if (!confirm('Delete ALL messages in this channel? This cannot be undone!')) return;
                
                try {
                  // Use API route with service role access
                  const response = await fetch('/api/dev/flush-messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId })
                  });
                  
                  const data = await response.json();
                  
                  if (!response.ok) {
                    console.error('Error deleting messages:', data.error);
                    alert('Failed to delete messages: ' + data.error);
                  } else {
                    alert(`Deleted ${data.count} messages`);
                    // Refresh the messages list
                    refresh();
                  }
                } catch (err) {
                  console.error('Error:', err);
                  alert('Failed to delete messages');
                }
              }}
              className="ml-auto btn btn-square btn-sm btn-ghost text-error hover:bg-error/10"
              title="DEV: Delete all messages"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
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
            <p className="text-base-content/50 font-light text-sm tracking-wide">Ingen beskeder</p>
            <p className="text-base-content/30 font-light text-xs mt-1">Vær den første til at starte samtalen</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.user_id === user?.id;
            const isLastRead = msg.id === lastReadMessageId;

            return (
              <div 
                key={msg.id} 
                ref={(el) => {
                  if (el && typeof msg.id === 'number') {
                    messageRefs.current.set(msg.id, el);
                  }
                }}
              >
                <Message
                  message={msg}
                  isOwnMessage={isOwnMessage}
                  isLastRead={isLastRead}
                  onImageClick={setEnlargedImageUrl}
                  onScrollToBottom={() => scrollToBottom(true)}
                  currentUserId={user?.id}
                />
              </div>
            );
          })
        )}

        {/* Jump to Bottom Button */}
        {showScrollToBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            className="fixed bottom-24 right-6 w-10 h-10 bg-primary/90 hover:bg-primary text-primary-content flex items-center justify-center shadow-lg z-10 transition-all duration-200"
            title={unreadCount > 0 ? `${unreadCount} nye beskeder` : 'Gå til bunden'}
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
        <div className="flex-none px-4 py-2 text-xs text-base-content/40 font-mono bg-base-100/30">
          {typingUsers.length === 1
            ? `${typingUsers[0]?.display_name || 'Someone'} typing...`
            : typingUsers.length === 2
            ? `${typingUsers[0]?.display_name || 'Someone'} and ${typingUsers[1]?.display_name || 'someone'} typing...`
            : `${typingUsers.length} people typing...`}
        </div>
      )}

      {/* Suggestion Dialog */}
      {showSuggestion && (
        <div className="flex-none px-4 py-4 bg-warning/5 border-t border-warning/20">
          <div className="font-mono text-xs uppercase tracking-wider text-warning mb-3">Besked markeret</div>
          <p className="text-sm text-base-content/70 mb-3 font-light">
            Indhold blev markeret. Alternativ formulering:
          </p>
          <p className="mb-4 text-base-content/80 bg-base-200/50 p-3 rounded-none border-l-2 border-primary/40">
            {showSuggestion}
          </p>
          <div className="flex gap-3">
            <button 
              onClick={useSuggestion}
              className="px-4 py-2 bg-success/20 text-success text-xs font-mono uppercase tracking-wider hover:bg-success/30 transition-colors duration-200"
            >
              Brug forslag
            </button>
            <button 
              onClick={cancelMessage}
              className="px-4 py-2 text-base-content/60 text-xs font-mono uppercase tracking-wider hover:text-base-content transition-colors duration-200"
            >
              Annuller
            </button>
          </div>
        </div>
      )}

      {/* Alert notification - positioned above input */}
      {alertMessage && (
        <div className="flex-none px-4 pb-2">
          <div role="alert" className={`alert alert-error bg-error/10 border border-error/30`}>
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current mt-0.5" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <div className="font-mono text-xs uppercase tracking-wider text-error mb-1">Besked blokeret</div>
                  <div className="text-sm text-base-content/80 mb-2">{alertMessage.message}</div>
                  {alertMessage.blockedText && (
                    <div className="text-xs bg-base-200/50 border-l-2 border-error/40 p-2 text-base-content/60 font-mono">
                      "{alertMessage.blockedText}"
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={() => setAlertMessage(null)}
              className="btn btn-sm btn-ghost btn-square text-error hover:bg-error/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input - Always visible at bottom */}
      <div className="flex-none px-4 py-4 border-t border-primary/10 bg-base-100/90 backdrop-blur-md">
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-4 relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-20 border border-base-300"
                onError={e => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'80\'><rect width=\'100%\' height=\'100%\' fill=\'#f3f4f6\'/><text x=\'50%\' y=\'50%\' text-anchor=\'middle\' dy=\'.3em\' font-size=\'16\' fill=\'#9ca3af\'>Billede fejler</text></svg>';
                }}
              />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-error text-error-content text-xs flex items-center justify-center hover:bg-error/80 transition-colors duration-200"
            >
              ×
            </button>
          </div>
        )}
        
        <div className="join w-full">
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
            className="btn join-item bg-base-200 hover:bg-base-300 w-10 h-10 min-h-10 p-0 border-0"
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
            className="input input-bordered join-item flex-1"
          />
          <button
            onClick={handleSend}
            disabled={sending || uploading || (!messageText.trim() && !selectedImage)}
            className="btn btn-primary join-item"
          >
            {uploading ? 'Uploader' : sending ? 'Sender' : 'Send'}
          </button>
        </div>
      </div>

      {/* Enlarged Image Modal - Lightbox */}
      {enlargedImageUrl && (
        <div 
          onClick={() => setEnlargedImageUrl(null)}
          className="fixed inset-0 bg-black/95 flex flex-col justify-center items-center z-50 cursor-pointer backdrop-blur-sm"
        >
          {/* Close button */}
          <button
            onClick={() => setEnlargedImageUrl(null)}
            className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center text-white/80 hover:text-white bg-black/50 hover:bg-black/70 transition-all duration-200"
            title="Luk (ESC)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[95vw] max-h-[95vh] flex justify-center items-center p-4"
          >
            {enlargedImageUrl && (
              <img 
                src={enlargedImageUrl}
                alt="Enlarged view"
                className="max-w-full max-h-[90vh] object-contain shadow-2xl"
                onError={e => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\'><rect width=\'100%\' height=\'100%\' fill=\'#111827\'/><text x=\'50%\' y=\'50%\' text-anchor=\'middle\' dy=\'.3em\' font-size=\'24\' fill=\'#9ca3af\'>Billede fejler</text></svg>';
                }}
              />
            )}
          </div>

          {/* Instructions */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white/60 text-sm font-light">
            Klik for at lukke
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
