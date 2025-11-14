'use client';

import { useState, useRef, useEffect } from 'react';
import ColoredEmoji from './ColoredEmoji';

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

  // Responsive positioning: 
  // - On small screens: bottom sheet style (fixed to bottom)
  // - On medium+ screens: positioned relative to message
  const getPositionClasses = () => {
    return `
      fixed bottom-0 left-0 right-0 z-[9999]
      md:absolute md:bottom-auto md:left-auto md:right-full md:top-0 md:mr-2
      max-h-[60vh] md:max-h-none
    `;
  };

  return (
    <>
      {/* Backdrop - only visible on small screens */}
      <div 
        className="fixed inset-0 bg-black/50 z-9998 md:hidden"
        onClick={onClose}
      />
      
      {/* Picker */}
      <div
        ref={pickerRef}
        className={`
          ${getPositionClasses()}
          bg-base-100 border-2 border-base-content/10 overflow-hidden
          w-full md:w-64
          rounded-t-xl md:rounded-none
          shadow-lg
          p-4
        `}
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
        <div className="grid grid-cols-6 gap-1 pb-4 overflow-y-auto max-h-[40vh] md:max-h-none">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className={`
                btn btn-ghost btn-square btn-sm
                hover:bg-primary/20
                transition-all duration-200
                ${selectedEmoji === emoji ? 'bg-primary/30 scale-110' : ''}
              `}
              title={emoji}
            >
              <ColoredEmoji emoji={emoji} size={24} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
