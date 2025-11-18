'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useReactions } from '@/hooks/useReactions';
import ReactionsDisplay from './ReactionsDisplay';
import ReactionPicker from './ReactionPicker';
import Avatar from './Avatar';
import { getRelativeTime } from '@/lib/time';

interface MessageProps {
  message: any;
  isOwnMessage: boolean;
  isLastRead: boolean;
  onImageClick: (url: string) => void;
  onScrollToBottom: () => void;
  currentUserId?: string;
  onRetry?: (message: any) => void;
}

function Message({
  message: msg,
  isOwnMessage,
  isLastRead,
  onImageClick,
  onScrollToBottom,
  currentUserId,
  onRetry,
}: MessageProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ x: number; y: number } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageVisible, setIsImageVisible] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const isOptimistic = msg.isOptimistic;
  const isLoading = msg.isLoading;
  const hasError = msg.hasError;
  const isUploadingImage = msg.isUploadingImage;
  
  // Lazy loading with IntersectionObserver
  useEffect(() => {
    if (!msg.image_url || !imageContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsImageVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before visible
      }
    );

    observer.observe(imageContainerRef.current);

    return () => observer.disconnect();
  }, [msg.image_url]);
  
  // Only enable reactions for non-optimistic messages with numeric IDs
  const messageId = typeof msg.id === 'number' ? msg.id : null;
  const { reactionGroups, toggleReaction } = useReactions({
    messageId: messageId || 0,
    currentUserId,
    enabled: !!messageId && !isOptimistic,
  });

  const handleAddReactionClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Just toggle the picker - position it absolutely in CSS
    setShowReactionPicker(true);
    setPickerPosition({ x: 0, y: 0 }); // Dummy values, we'll use CSS positioning
  };

  const handleReactionSelect = (emoji: string) => {
    if (messageId) {
      toggleReaction(emoji);
    }
    setShowReactionPicker(false);
  };

  return (
    <div className={`chat ${isOwnMessage ? 'chat-end' : 'chat-start'} relative group`}>
      {/* Last Read Indicator */}
      {isLastRead && (
        <div className="absolute -top-12 left-0 right-0 flex items-center gap-3 z-10 px-4">
          <div className="flex-1 border-t-2 border-dashed border-info/30"></div>
          <div className="flex items-center gap-2 bg-info/90 text-info-content px-4 py-1.5 text-xs font-medium uppercase tracking-wider shadow-lg">
            <div className="w-1 h-1 bg-info-content rounded-full"></div>
            <span>Sidst læst</span>
            <div className="w-1 h-1 bg-info-content rounded-full"></div>
            <button
              onClick={onScrollToBottom}
              className="ml-2 text-info-content/70 hover:text-info-content transition-colors"
              title="Gå til seneste besked"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-info/30"></div>
        </div>
      )}

      {/* Avatar */}
      <div className="chat-image avatar">
        <Avatar
          user={{
            display_name: isOwnMessage
              ? 'Dig'
              : (msg.profiles?.display_name || msg.user?.user_metadata?.display_name || msg.user?.email || 'Ukendt bruger'),
            avatar_url: isOwnMessage ? msg.user?.user_metadata?.avatar_url : msg.profiles?.avatar_url,
            avatar_color: isOwnMessage ? msg.user?.user_metadata?.avatar_color : msg.profiles?.avatar_color,
          }}
          size="sm"
        />
      </div>

      <div className="chat-header">
        {isOwnMessage ? 'Dig' : (msg.profiles?.display_name || msg.user?.user_metadata?.display_name || msg.user?.email || 'Ukendt bruger')}
      </div>

      <div
        className={`chat-bubble relative ${isOwnMessage ? 'chat-bubble-primary' : 'chat-bubble-neutral'} ${
          isOptimistic ? 'opacity-70' : ''
        } ${hasError ? 'border-2 border-error' : ''} ${msg.image_url && !msg.body ? 'p-0' : ''} ${
          isOwnMessage ? 'dashed-line-right' : 'dashed-line-left'
        }`}
      >
        {/* Flagged indicator - small orange flag on left side */}
        {msg.is_flagged && isOwnMessage && (
          <div 
            className="tooltip tooltip-warning absolute -top-2 -left-2 z-10" 
            data-tip="Markeret til gennemgang - din besked blev sendt, men en lærer vil gennemgå den"
          >
            <div className="w-6 h-6 bg-warning flex items-center justify-center shadow-lg">
              <svg className="w-3.5 h-3.5 text-warning-content" fill="currentColor" viewBox="0 0 24 24" strokeWidth={0}>
                <path d="M4 4v16l4-4h12V4H4z" />
              </svg>
            </div>
          </div>
        )}
        
        {msg.image_url && (
          <div ref={imageContainerRef} className="relative">
            {/* Skeleton loader */}
            {!imageLoaded && !imageError && (
              <div className="skeleton w-full h-48 mb-3"></div>
            )}
            
            {/* Actual image - only load when visible */}
            {isImageVisible && (
              <img
                ref={imageRef}
                src={msg.image_url}
                alt="Uploaded image"
                onClick={() => !isUploadingImage && !imageError && onImageClick(msg.image_url || '')}
                className={`max-w-xs w-full h-auto object-cover transition-all block ${msg.body ? 'mb-3' : ''} ${
                  !isUploadingImage && !imageError ? 'cursor-pointer hover:brightness-90' : ''
                } ${
                  isOptimistic && isLoading ? 'opacity-50' : ''
                } ${
                  !imageLoaded ? 'hidden' : ''
                }`}
                onLoad={() => {
                  setImageLoaded(true);
                  setImageError(false);
                }}
                onError={() => {
                  setImageLoaded(true);
                  setImageError(true);
                }}
              />
            )}
            
            {/* Error state with retry */}
            {imageError && (
              <div className="w-full max-w-xs h-48 bg-base-200 border-2 border-error/20 flex flex-col items-center justify-center gap-2 mb-3">
                <svg className="w-12 h-12 text-error/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-error/80 font-medium uppercase tracking-wider">Billede kunne ikke indlæses</p>
                <button
                  onClick={() => {
                    setImageError(false);
                    setImageLoaded(false);
                    // Force reload by changing src
                    if (imageRef.current) {
                      const src = imageRef.current.src;
                      imageRef.current.src = '';
                      setTimeout(() => {
                        if (imageRef.current) imageRef.current.src = src;
                      }, 10);
                    }
                  }}
                  className="btn btn-xs btn-error btn-outline"
                >
                  Prøv igen
                </button>
              </div>
            )}
            
            {/* Upload progress overlay */}
            {isUploadingImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-base-content/20">
                <div className="flex flex-col items-center gap-2">
                  <span className="loading loading-spinner loading-md text-base-100"></span>
                  <span className="text-xs font-medium text-base-100 bg-base-content/50 px-3 py-1">
                    Uploader...
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        {msg.body && <div className="whitespace-pre-wrap px-1">{msg.body}</div>}
        
        {/* Reaction Picker - positioned absolutely relative to this bubble */}
        {showReactionPicker && pickerPosition && (
          <ReactionPicker
            onSelect={handleReactionSelect}
            onClose={() => setShowReactionPicker(false)}
            position={pickerPosition}
          />
        )}
      </div>

      <div className="chat-footer opacity-90">
        <div className={`flex flex-col gap-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
            <time className="text-xs">{getRelativeTime(msg.created_at)}</time>
            
            {isOptimistic && (
              <span className="text-xs">{isLoading ? 'Sender...' : hasError ? 'Fejlet' : 'Sendt'}</span>
            )}
            {hasError && (
              <div className="flex items-center gap-2">
                <div className="text-error text-xs">Kunne ikke sendes</div>
                {onRetry && (
                  <button
                    onClick={() => onRetry(msg)}
                    className="btn btn-xs btn-error btn-outline"
                    title="Prøv igen"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Prøv igen
                  </button>
                )}
              </div>
            )}
            {msg.edited_at && (
              <div>(redigeret)</div>
            )}
            {isOwnMessage && !isOptimistic && msg.read_receipts && msg.read_receipts.length > 0 && (
              <div className="tooltip" data-tip={`Læst af ${msg.read_receipts.length}`}>
                ✓
              </div>
            )}
          </div>
          
          {/* Reactions on new line with + button after them */}
          {messageId && !isOptimistic && (
            <div className={`flex items-center gap-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
              {reactionGroups.length > 0 && (
                <ReactionsDisplay
                  reactions={reactionGroups}
                  onToggle={toggleReaction}
                />
              )}
              <button
                onClick={handleAddReactionClick}
                className="btn btn-xs px-2 h-5 min-h-5 bg-transparent border-0 hover:bg-accent/20 hover:text-accent text-base-content/60 transition-all duration-200 lg:opacity-0 lg:invisible lg:group-hover:opacity-100 lg:group-hover:visible"
                title="Tilføj reaktion"
                type="button"
              >
                <span className="text-sm font-black">+</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent re-rendering all messages on every keystroke
export default React.memo(Message, (prevProps, nextProps) => {
  // Only re-render if these specific props changed
  // Allow ID to change from optimistic to real without re-rendering (prevents flicker)
  const prevIsOptimistic = prevProps.message.isOptimistic;
  const nextIsOptimistic = nextProps.message.isOptimistic;
  
  // If transitioning from optimistic to real, check content instead of ID
  if (prevIsOptimistic && !nextIsOptimistic) {
    // Transitioning from optimistic to real - check if content is same
    return (
      prevProps.message.body === nextProps.message.body &&
      prevProps.message.image_url === nextProps.message.image_url &&
      prevProps.message.user_id === nextProps.message.user_id &&
      prevProps.isLastRead === nextProps.isLastRead &&
      prevProps.currentUserId === nextProps.currentUserId
    );
  }
  
  // Normal comparison for other cases
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.body === nextProps.message.body &&
    prevProps.message.image_url === nextProps.message.image_url &&
    prevProps.message.isOptimistic === nextProps.message.isOptimistic &&
    prevProps.message.isLoading === nextProps.message.isLoading &&
    prevProps.message.hasError === nextProps.message.hasError &&
    prevProps.message.reactions?.length === nextProps.message.reactions?.length &&
    prevProps.isLastRead === nextProps.isLastRead &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});
