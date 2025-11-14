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
    const rect = event.currentTarget.getBoundingClientRect();
    setPickerPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setShowReactionPicker(true);
  };

  const handleReactionSelect = (emoji: string) => {
    if (messageId) {
      toggleReaction(emoji);
    }
    setShowReactionPicker(false);
  };

  return (
    <div className={`chat ${isOwnMessage ? 'chat-end' : 'chat-start'} ${isLastRead ? 'relative' : ''}`}>
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

      {/* Use DaisyUI indicator component to attach reactions to bubble */}
      <div className="indicator">
        {/* Reactions as indicator item - positioned at bottom */}
        {messageId && !isOptimistic && (
          <div className="indicator-item indicator-bottom indicator-center">
            <ReactionsDisplay
              reactions={reactionGroups}
              onToggle={toggleReaction}
              onAddClick={handleAddReactionClick}
            />
          </div>
        )}

        <div
          className={`chat-bubble relative ${isOwnMessage ? 'chat-bubble-primary' : 'chat-bubble-neutral'} ${
            isOptimistic ? 'opacity-70' : ''
          } ${hasError ? 'border-2 border-error' : ''} ${msg.image_url && !msg.body ? 'p-0' : ''} ${
            isOwnMessage ? 'dashed-line-right' : 'dashed-line-left'
          }`}
        >
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
        </div>
      </div>

      {/* Reaction Picker */}
      {showReactionPicker && pickerPosition && (
        <ReactionPicker
          onSelect={handleReactionSelect}
          onClose={() => setShowReactionPicker(false)}
          position={pickerPosition}
        />
      )}

      <div className="chat-footer opacity-90">
        <time className="text-xs">{getRelativeTime(msg.created_at)}</time>
        {isOptimistic && (
          <span className="ml-2 text-xs">{isLoading ? 'Sender...' : hasError ? 'Fejlet' : 'Sendt'}</span>
        )}
        {hasError && (
          <div className="text-error italic mt-1 text-xs">Besked kunne ikke sendes. Prøv igen.</div>
        )}
        {msg.edited_at && (
          <div className="ml-2">(redigeret)</div>
        )}
        {isOwnMessage && !isOptimistic && msg.read_receipts && msg.read_receipts.length > 0 && (
          <div className="ml-2">✓✓ Læst af {msg.read_receipts.length}</div>
        )}
      </div>
    </div>
  );
}
