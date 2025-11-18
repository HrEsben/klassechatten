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

  // Calculate optimal placement based on trigger button position
  const [desktopStyle, setDesktopStyle] = useState<React.CSSProperties>({});
  const [isPositioned, setIsPositioned] = useState(false);
  
  useEffect(() => {
    if (window.innerWidth >= 768 && position) { // md breakpoint
      // Use the button position passed from parent
      const buttonRect = {
        left: position.x,
        top: position.y,
        right: position.x + 40, // Approximate button width
        bottom: position.y + 20, // Approximate button height
      };
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const pickerWidth = 256; // w-64 = 16rem = 256px
      const pickerHeight = 400; // Approximate picker height
      const margin = 8; // 0.5rem gap
      
      // Calculate available space on both sides of the button (horizontal)
      const spaceOnLeft = buttonRect.left;
      const spaceOnRight = viewportWidth - buttonRect.right;
      
      // Calculate available space above and below button (vertical)
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
        
      // Determine horizontal position
      let left: number;
      
      if (spaceOnRight >= pickerWidth + margin) {
        // Position to the right of button
        left = buttonRect.right + margin;
      } else if (spaceOnLeft >= pickerWidth + margin) {
        // Position to the left of button
        left = buttonRect.left - pickerWidth - margin;
      } else {
        // Not enough space on either side, position where there's more room
        if (spaceOnLeft > spaceOnRight) {
          left = Math.max(margin, buttonRect.left - pickerWidth - margin);
        } else {
          left = Math.min(viewportWidth - pickerWidth - margin, buttonRect.right + margin);
        }
      }
      
      // Determine vertical position
      let top: number;
      
      if (spaceBelow >= pickerHeight + margin) {
        // Position below button
        top = buttonRect.bottom + margin;
      } else if (spaceAbove >= pickerHeight + margin) {
        // Position above button - calculate top position so picker appears above
        top = buttonRect.top - pickerHeight - margin;
      } else {
        // Not enough space above or below, position where there's more room
        if (spaceAbove > spaceBelow) {
          // Position at top of viewport with some margin
          top = margin;
        } else {
          // Position aligned with button top
          top = buttonRect.top;
        }
      }
      
      setDesktopStyle({
        position: 'fixed',
        top: top,
        left: left,
        right: 'auto',
        bottom: 'auto',
      });
      setIsPositioned(true);
    } else {
      // Mobile - use bottom sheet
      setIsPositioned(true);
    }
  }, []);

  // Responsive positioning: 
  // - On small screens: bottom sheet style (fixed to bottom)
  // - On medium+ screens: fixed positioning calculated based on message location
  const getPositionClasses = () => {
    const visibilityClass = isPositioned ? '' : 'opacity-0';
    
    return `
      fixed bottom-0 left-0 right-0 z-[9999]
      md:w-64
      ${visibilityClass}
      max-h-[60vh] md:max-h-96
      transition-opacity duration-100
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
        style={window.innerWidth >= 768 ? desktopStyle : undefined}
        className={`
          ${getPositionClasses()}
          bg-base-100 border-2 border-base-content/10 overflow-hidden
          w-full md:w-64
          md:h-auto
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
        <div className="grid grid-cols-6 gap-1 pb-4 overflow-y-auto max-h-[40vh] md:max-h-64">
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
