'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRoomMessages } from '@/hooks/useRoomMessages';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useRoomUsers } from '@/hooks/useRoomUsers';
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

  // Load draft from localStorage when room changes
  useEffect(() => {
    const draftKey = `chat-draft-${roomId}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setMessageText(savedDraft);
    }
  }, [roomId]);

  // Save draft to localStorage when text changes (debounced)
  useEffect(() => {
    const draftKey = `chat-draft-${roomId}`;
    if (messageText.trim()) {
      localStorage.setItem(draftKey, messageText);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [messageText, roomId]);
  const [roomName, setRoomName] = useState<string>('Chat Room');
  const [showFlagConfirmation, setShowFlagConfirmation] = useState<{ warning: string, originalMessage: string } | null>(null);
  const [pendingMessage, setPendingMessage] = useState<{ text?: string, imageUrl?: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  const [lastReadMessageId, setLastReadMessageId] = useState<number | null>(null);
  const [hasScrolledToLastRead, setHasScrolledToLastRead] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState<Map<string, number>>(new Map());
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const previousMessageCountRef = useRef(0);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef(0);
  const recentSendTimesRef = useRef<number[]>([]); // Track last 3 message times

  // Auto-dismiss alert messages after 5 seconds
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

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
    onlineUsers,
    typingUsers,
    updateTypingStatus,
    addOptimisticMessage, 
    updateOptimisticMessage,
    updateOptimisticMessageImage,
    loadMore,
    hasMore,
    loadingMore 
  } = useRoomMessages({ 
    roomId,
    limit: 50,
    userId: user?.id,
    displayName: user?.user_metadata?.display_name || user?.email || 'Anonymous',
    enabled: !!user,
  });
  
  const { sendMessage, uploadImage, sending, uploading } = useSendMessage();
  
  // Fetch all users in the room (including offline users)
  const { users: allRoomUsers, loading: usersLoading } = useRoomUsers({
    roomId,
    enabled: !!user,
  });

  // Wrapper for typing status that's compatible with the UI
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      await updateTypingStatus(isTyping);
    },
    [updateTypingStatus]
  );

  // Create a set of online user IDs for quick lookup
  const onlineUserIds = useMemo(() => {
    return new Set(onlineUsers);
  }, [onlineUsers]);

  // Merge typing status into all users
  const usersWithStatus = useMemo(() => {
    return allRoomUsers.map(user => {
      return {
        ...user,
        online: onlineUserIds.has(user.user_id),
        typing: typingUsers.includes(user.user_id),
      };
    });
  }, [allRoomUsers, onlineUsers, onlineUserIds]);

    // Read receipts
  useReadReceipts({
    userId: user?.id || '',
    messages: messages
      .filter(msg => !msg.isOptimistic)
      .map(msg => ({ id: msg.id as number, user_id: msg.user_id }))
  });

  // Scroll detection and management
  const checkIfAtBottom = () => {
    const container = mainScrollRef.current;
    if (!container) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 50; // pixels from bottom
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    
    setIsAtBottom(atBottom);
    return atBottom;
  };

  const scrollToBottom = useCallback((smooth = false) => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({
        top: mainScrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
      setIsAtBottom(true);
      setUnreadCount(0);
      setShowScrollToBottom(false);
    }
  }, []);

  // Stable callback for message components to scroll to bottom smoothly
  const scrollToBottomSmooth = useCallback(() => scrollToBottom(true), [scrollToBottom]);

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

  // Infinite scroll: Load more messages when scrolling to top
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !mainScrollRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          console.log('🔄 Loading more messages...');
          
          // Store current scroll position
          const scrollContainer = mainScrollRef.current;
          if (scrollContainer) {
            previousScrollHeightRef.current = scrollContainer.scrollHeight;
          }
          
          loadMore();
        }
      },
      {
        root: mainScrollRef.current,
        rootMargin: '100px', // Start loading 100px before reaching the trigger
        threshold: 0.1,
      }
    );

    observer.observe(loadMoreTriggerRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  // Restore scroll position after loading more messages
  useEffect(() => {
    const scrollContainer = mainScrollRef.current;
    if (!scrollContainer || !loadingMore || previousScrollHeightRef.current === 0) return;

    // After loadingMore becomes false, restore scroll position
    if (!loadingMore && previousScrollHeightRef.current > 0) {
      const newScrollHeight = scrollContainer.scrollHeight;
      const heightDifference = newScrollHeight - previousScrollHeightRef.current;
      
      // Scroll down by the height difference to maintain the user's view
      scrollContainer.scrollTop = heightDifference;
      
      console.log('📍 Restored scroll position after loading more messages');
      previousScrollHeightRef.current = 0;
    }
  }, [loadingMore]);

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

  // Handle typing indicator with simple 5-second window
  const isTypingRef = useRef(false);
  const lastTypingUpdateRef = useRef(0);
  
  const handleInputChange = (value: string) => {
    setMessageText(value);

    // Only update typing state if it's been more than 4 seconds since last update
    // This reduces frequency of presence updates
    if (value.length > 0) {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastTypingUpdateRef.current;
      
      // Only trigger typing update if we haven't updated in the last 4 seconds
      if (timeSinceLastUpdate > 4000) {
        lastTypingUpdateRef.current = now;
        
        if (!isTypingRef.current) {
          isTypingRef.current = true;
          setTyping(true);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Auto-clear typing after 5 seconds
        typingTimeoutRef.current = setTimeout(() => {
          isTypingRef.current = false;
          setTyping(false);
          lastTypingUpdateRef.current = 0;
        }, 5000);
      }
    } else {
      // Clear typing immediately when input is empty
      if (isTypingRef.current) {
        isTypingRef.current = false;
        setTyping(false);
        lastTypingUpdateRef.current = 0;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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

  const handleSend = async (forceSend = false) => {
    if (!messageText.trim() && !selectedImage) return;

    // Rate limiting: Only activate after 3 messages within 3 seconds
    const now = Date.now();
    const recentSends = recentSendTimesRef.current;
    
    // Remove sends older than 3 seconds
    const validSends = recentSends.filter(time => now - time < 3000);
    
    // Check if user has sent 3+ messages in the last 3 seconds
    if (validSends.length >= 3) {
      const oldestSend = Math.min(...validSends);
      const timeSinceOldest = now - oldestSend;
      
      // If 3 messages were sent within 3 seconds, enforce 1 second delay
      if (timeSinceOldest < 3000) {
        const lastSend = Math.max(...validSends);
        const timeSinceLastSend = now - lastSend;
        
        if (timeSinceLastSend < 1000) {
          const remainingTime = Math.ceil((1000 - timeSinceLastSend) / 1000);
          setAlertMessage({
            type: 'warning',
            message: `Vent venligst ${remainingTime} sekund før du sender næste besked`
          });
          return;
        }
      }
    }

    // Update recent send times
    recentSendTimesRef.current = [...validSends, now];

    // Stop typing indicator
    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Save message content before clearing
    const messageBody = messageText.trim();
    const imageFile = selectedImage;
    const imagePreviewUrl = imagePreview; // Save preview for optimistic UI

    // 1. INSTANT: Add optimistic message and clear input immediately
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage = {
      id: tempId,
      room_id: roomId,
      user_id: currentUser.id,
      body: messageBody || null,
      image_url: imageFile ? imagePreviewUrl : null, // Show preview immediately
      created_at: new Date().toISOString(),
      user: {
        id: currentUser.id,
        email: currentUser.email || '',
        user_metadata: {
          display_name: currentUser.user_metadata?.display_name || currentUser.email || 'You'
        }
      },
      is_flagged: false,
      reactions: [],
      read_by: [],
      reply_to: null,
      isOptimistic: true,
      isLoading: imageFile ? true : false, // Loading if we have an image to upload
      isUploadingImage: imageFile ? true : false
    };

    const optimisticMessageId = addOptimisticMessage(optimisticMessage as any);

    // Clear input immediately for instant feel
    setMessageText('');
    handleRemoveImage();
    setTimeout(() => scrollToBottom(false), 50);
    setTimeout(() => inputRef.current?.focus(), 100);

    // 2. ASYNC: Upload image in background (if needed)
    let imageUrl: string | null = null;
    if (imageFile) {
      // Upload happens in background while user sees optimistic message with progress
      const result = await uploadImage(imageFile, (progress) => {
        setUploadProgress(progress);
      });
      
      setUploadProgress(0); // Reset progress
      
      if (!result.url) {
        // Mark optimistic message as failed
        if (optimisticMessageId) {
          updateOptimisticMessage(optimisticMessageId, false);
        }
        setAlertMessage({
          type: 'error',
          message: 'Kunne ikke uploade billede. Prøv igen.'
        });
        return;
      }
      
      imageUrl = result.url;
      
      // Update optimistic message with real image URL
      if (optimisticMessageId) {
        updateOptimisticMessageImage(optimisticMessageId, imageUrl);
      }
    }

    // 3. ASYNC: Send to server (non-blocking)
    try {
      const result = await sendMessage(
        roomId,
        messageBody || undefined,
        imageUrl || undefined,
        undefined, // replyTo
        optimisticMessageId, // Pass tempId so callback knows which optimistic message to remove
        (tempId: string, success: boolean) => {
          // updateOptimisticMessage callback - this handles the optimistic update
          updateOptimisticMessage(tempId, success);
        }
      );

      if (result.error) {
        // Error already handled by callback above
        setAlertMessage({
          type: 'error',
          message: result.error
        });
        return;
      }

      // Show notification if message was flagged
      if (result.flagged || result.status === 'flagged') {
        setAlertMessage({
          type: 'warning',
          message: 'Din besked blev markeret til gennemgang på grund af muligt upassende indhold.'
        });
      }

      setShowSuggestion(null);

    } catch (error) {
      console.error('Error sending message:', error);
      if (optimisticMessageId) {
        updateOptimisticMessage(optimisticMessageId, false);
      }
    }
  };

  const handleConfirmFlaggedMessage = async () => {
    if (!pendingMessage) return;

    // Close confirmation modal
    setShowFlagConfirmation(null);

    // Send message with force_send = true
    await handleSend(true);
    
    // Clear pending message
    setPendingMessage(null);
    
    // Auto-focus input for next message
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCancelFlaggedMessage = () => {
    // Close confirmation modal without sending
    setShowFlagConfirmation(null);
    setPendingMessage(null);
    
    // Keep the message text so user can edit it
    // Already in messageText state
    
    // Auto-focus input so user can edit
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleRetry = useCallback(async (failedMessage: any) => {
    if (!failedMessage.id || !user) return;

    const messageId = failedMessage.id;
    const currentAttempts = retryAttempts.get(messageId) || 0;
    
    // Max 3 retry attempts
    if (currentAttempts >= 3) {
      setAlertMessage({
        type: 'error',
        message: 'Maksimalt antal forsøg nået. Tjek din forbindelse og prøv igen senere.'
      });
      return;
    }

    // Exponential backoff: 1s, 2s, 4s
    const backoffDelay = Math.pow(2, currentAttempts) * 1000;
    
    // Update retry count
    const newAttempts = new Map(retryAttempts);
    newAttempts.set(messageId, currentAttempts + 1);
    setRetryAttempts(newAttempts);

    // Show retry attempt message
    setAlertMessage({
      type: 'info',
      message: `Prøver igen... (forsøg ${currentAttempts + 1}/3)`
    });

    // Wait for backoff delay
    await new Promise(resolve => setTimeout(resolve, backoffDelay));

    try {
      // Try to send again
      let imageUrl = failedMessage.image_url;
      
      // If there's an image URL that looks like a blob/local URL, re-upload it
      if (imageUrl && imageUrl.startsWith('blob:')) {
        // Can't re-upload blob URLs, show error
        setAlertMessage({
          type: 'error',
          message: 'Kan ikke gensende billede. Send beskeden igen med et nyt billede.'
        });
        return;
      }

      const result = await sendMessage(
        roomId, 
        failedMessage.body || undefined, 
        imageUrl || undefined,
        undefined, // replyTo
        messageId, // Pass the failed message ID as tempId for callback
        (tempId: string, success: boolean) => {
          if (success) {
            updateOptimisticMessage(tempId, true);
          }
        }
      );

      if (result.status === 'allow' || result.status === 'flag') {
        // Success! Clear retry count and remove failed message (real one will arrive via realtime)
        newAttempts.delete(messageId);
        setRetryAttempts(newAttempts);
        
        // Remove the optimistic failed message
        updateOptimisticMessage(messageId, true);
        
        setAlertMessage({
          type: 'success',
          message: 'Besked sendt!'
        });
      } else {
        // Failed again (blocked or error)
        if (currentAttempts + 1 >= 3) {
          setAlertMessage({
            type: 'error',
            message: 'Kunne ikke sende besked efter 3 forsøg. Tjek din forbindelse.'
          });
        }
      }
    } catch (error) {
      if (currentAttempts + 1 >= 3) {
        setAlertMessage({
          type: 'error',
          message: 'Kunne ikke sende besked. Tjek din internetforbindelse.'
        });
      }
    }
  }, [retryAttempts, user, sendMessage, roomId, updateOptimisticMessage]);

  const useSuggestion = async () => {
    if (!showSuggestion) return;
    
    // Create optimistic message for suggestion
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage = {
      room_id: roomId,
      user_id: currentUser.id,
      body: showSuggestion,
      image_url: null,
      created_at: new Date().toISOString(),
      user: {
        id: currentUser.id,
        email: currentUser.email || '',
        user_metadata: {
          display_name: currentUser.user_metadata?.display_name || currentUser.email || 'You'
        }
      },
      reply_to: null,
      edited_at: null,
      deleted_at: null,
    };

    const optimisticMessageId = addOptimisticMessage(optimisticMessage as any);
    
    // Clear input and suggestion immediately
    setShowSuggestion(null);
    handleRemoveImage();
    setTimeout(() => scrollToBottom(false), 50);
    
    // Send the suggested text
    await sendMessage(
      roomId, 
      showSuggestion, 
      undefined, // imageUrl
      undefined, // replyTo
      optimisticMessageId, // tempId
      (tempId: string, success: boolean) => {
        updateOptimisticMessage(tempId, success);
      }
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
    <div className="flex flex-col lg:flex-row h-full w-full">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 bg-base-200 border-r-2 border-base-content/10 overflow-y-auto">
        <UsersSidebar 
          users={usersWithStatus} 
          onlineUserIds={onlineUserIds}
          currentUserId={user?.id}
          className="w-full"
        />
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Subheader */}
        <div className="flex-none bg-base-100 border-b-2 border-base-content/10">
          <div className="navbar">
            <div className="navbar-start">
              <label htmlFor="users-drawer" className="btn btn-square btn-ghost lg:hidden">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </label>
              
              {onBack && (
                <button
                  onClick={onBack}
                  className="btn btn-ghost btn-square"
                  title="Tilbage"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="navbar-center">
              <h2 className="text-lg font-light tracking-wide text-base-content">#{roomName}</h2>
            </div>
            
            <div className="navbar-end">
              {/* DEV: Flush all messages button */}
              <button
                onClick={async () => {
                  if (!confirm('Delete ALL messages in this channel? This cannot be undone!')) return;
                  
                  try {
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
                      refresh();
                    }
                  } catch (err) {
                    console.error('Error:', err);
                    alert('Failed to delete messages');
                  }
                }}
                className="btn btn-square btn-ghost text-error"
                title="DEV: Delete all messages"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area - scrollable */}
        <div 
          ref={mainScrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto bg-base-200 relative"
        >
          <div
            ref={messagesContainerRef}
            className="p-4 space-y-4 min-h-full"
          >
        {/* Load More Trigger - at the top */}
        {hasMore && !loading && (
          <div ref={loadMoreTriggerRef} className="flex justify-center py-2">
            {loadingMore ? (
              <div className="flex items-center gap-2 text-base-content/40 text-xs font-mono">
                <span className="loading loading-spinner loading-sm"></span>
                <span>Indlæser ældre beskeder...</span>
              </div>
            ) : (
              <button
                onClick={loadMore}
                className="btn btn-ghost btn-sm text-base-content/60 hover:text-base-content font-mono text-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                INDLÆS ÆLDRE
              </button>
            )}
          </div>
        )}

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
                  onScrollToBottom={scrollToBottomSmooth}
                  currentUserId={user?.id}
                  onRetry={handleRetry}
                />
              </div>
            );
          })
        )}
          </div>

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
          <div className="flex-none px-4 py-2 text-xs text-base-content/40 font-mono bg-base-100/30 border-t border-base-content/10">
            {typingUsers.length === 1
              ? `${allRoomUsers.find(u => u.user_id === typingUsers[0])?.display_name || 'Someone'} typing...`
              : typingUsers.length === 2
              ? `${allRoomUsers.find(u => u.user_id === typingUsers[0])?.display_name || 'Someone'} and ${allRoomUsers.find(u => u.user_id === typingUsers[1])?.display_name || 'someone'} typing...`
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

        {/* Alert notification - for upload errors and warnings only */}
        {alertMessage && (
          <div className="flex-none px-4 py-2 bg-base-200 border-t border-base-content/10">
            <div role="alert" className={`alert ${alertMessage.type === 'error' ? 'alert-error' : 'alert-warning'} alert-soft`}>
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current mt-0.5" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm text-base-content/80">{alertMessage.message}</div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setAlertMessage(null)}
                className="btn btn-sm btn-ghost btn-square hover:bg-base-content/10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Input Area - fixed at bottom */}
        <div className="flex-none p-4 border-t-2 border-base-content/10 bg-base-100">
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
        
        {/* Upload Progress */}
        {uploading && uploadProgress > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs text-base-content/60 mb-1">
              <span>Uploader billede...</span>
              <span className="font-medium">{Math.round(uploadProgress)}%</span>
            </div>
            <progress 
              className="progress progress-primary w-full" 
              value={uploadProgress} 
              max="100"
            ></progress>
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
            disabled={uploading}
            className="btn join-item bg-base-200 hover:bg-base-300 w-10 h-10 min-h-10 p-0 border-0"
            title="Upload billede"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Skriv en besked..."
            disabled={uploading}
            className="input input-bordered join-item flex-1"
          />
          <button
            onClick={() => handleSend()}
            disabled={uploading || (!messageText.trim() && !selectedImage)}
            className="btn btn-primary join-item"
          >
            {uploading ? 'Uploader' : 'Send'}
          </button>
        </div>
      </div>
      </div>

      {/* Mobile Drawer for Sidebar */}
      <div className="drawer lg:hidden">
        <input id="users-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-side z-50">
          <label htmlFor="users-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
          <UsersSidebar 
            users={usersWithStatus} 
            onlineUserIds={onlineUserIds}
            currentUserId={user?.id}
            className="w-64 min-h-full bg-base-200"
          />
        </div>
      </div>

      {/* Enlarged Image Modal - Lightbox */}
      {enlargedImageUrl && (
        <div 
          onClick={() => setEnlargedImageUrl(null)}
          className="fixed inset-0 bg-black/95 flex flex-col justify-center items-center z-50 cursor-pointer backdrop-blur-sm"
        >
          <button
            onClick={() => setEnlargedImageUrl(null)}
            className="absolute top-6 right-6 btn btn-circle btn-ghost text-white hover:bg-white/20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <img
            src={enlargedImageUrl}
            alt="Enlarged view"
            className="max-w-[95vw] max-h-[95vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Flag Confirmation Modal */}
      {showFlagConfirmation && (
        <dialog open className="modal modal-open">
          <div className="modal-box border-2 border-warning/20 bg-base-100">
            {/* Warning Header */}
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-warning shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-base-content/80">
                {showFlagConfirmation.warning}
              </p>
            </div>

            {/* Original Message */}
            <div className="bg-base-200 border-2 border-base-content/10 p-4 mb-4">
              <p className="text-sm text-base-content">
                {showFlagConfirmation.originalMessage}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCancelFlaggedMessage}
                className="btn btn-ghost flex-1"
              >
                Ret besked
              </button>
              <button
                onClick={handleConfirmFlaggedMessage}
                className="btn bg-base-content text-base-100 hover:bg-warning hover:text-warning-content flex-1"
              >
                Send alligevel
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={handleCancelFlaggedMessage}></div>
        </dialog>
      )}
    </div>
  );
}
