'use client';

import { useState, useRef, useEffect } from 'react';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
}

// Common emoji reactions for a school chat
const EMOJI_OPTIONS = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🎉', '🔥', '⭐', '✅', '👏', '🙏',
  '💯', '🤔', '😊', '😎', '🤩', '😴',
  '🎨', '📚', '✏️', '🏆', '💪', '🙌'
];

export default function ReactionPicker({ onSelect, onClose, position }: ReactionPickerProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleEmojiClick = (emoji: string) => {
    setSelectedEmoji(emoji);
    onSelect(emoji);
    // Immediate close for smooth UX
    onClose();
  };

  const positionStyle = {
    position: 'absolute' as const,
    top: '0',
    right: 'calc(100% + 8px)', // Position to the left of the message bubble with 8px gap
    zIndex: 9999,
  };

  return (
    <div
      ref={pickerRef}
      className="bg-base-100 border-2 border-base-content/10 p-4 w-64"
      style={positionStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-base-content/10">
        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">
          Tilføj reaktion
        </h3>
        <button
          onClick={onClose}
          className="btn btn-ghost btn-square btn-xs"
          aria-label="Luk"
        >
          <svg
            className="w-4 h-4 stroke-current"
            strokeWidth={2}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="square"
              strokeLinejoin="miter"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-6 gap-1 max-w-xs">
        {EMOJI_OPTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            className={`
              btn btn-ghost btn-square btn-sm
              text-2xl
              hover:bg-primary/20
              transition-all duration-200
              ${selectedEmoji === emoji ? 'bg-primary/30 scale-110' : ''}
            `}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
