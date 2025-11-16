'use client';

import { useState } from 'react';
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
}

export default function Message({
  message: msg,
  isOwnMessage,
  isLastRead,
  onImageClick,
  onScrollToBottom,
  currentUserId,
}: MessageProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ x: number; y: number } | null>(null);

  const isOptimistic = msg.isOptimistic;
  const isLoading = msg.isLoading;
  const hasError = msg.hasError;
  
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
          <img
            src={msg.image_url}
            alt="Uploaded image"
            onClick={() => onImageClick(msg.image_url || '')}
            className={`max-w-xs w-full h-auto object-cover cursor-pointer hover:brightness-90 transition-all block ${isOptimistic && isLoading ? 'opacity-50' : ''} ${msg.body ? 'mb-3' : ''}`}
            onError={e => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'240\'><rect width=\'100%\' height=\'100%\' fill=\'#f3f4f6\'/><text x=\'50%\' y=\'50%\' text-anchor=\'middle\' dy=\'.3em\' font-size=\'16\' fill=\'#9ca3af\'>Billede fejler</text></svg>';
            }}
          />
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
              <div className="text-error italic mt-1 text-xs">Besked kunne ikke sendes. Prøv igen.</div>
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
