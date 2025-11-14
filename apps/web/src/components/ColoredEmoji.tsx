'use client';

import React from 'react';

interface ColoredEmojiProps {
  emoji: string;
  size?: number;
  className?: string;
}

/**
 * ColoredEmoji component renders Google's Noto Emoji in full color
 * Used in the picker where we need full emoji details visible
 */
export default function ColoredEmoji({ emoji, size = 16, className = '' }: ColoredEmojiProps) {
  // Convert emoji to Unicode codepoint
  const codepoint = Array.from(emoji)
    .map(char => char.codePointAt(0)?.toString(16).padStart(4, '0'))
    .join('-');
  
  // Use emoji-datasource-google CDN for Noto emoji images
  const imageUrl = `https://cdn.jsdelivr.net/npm/emoji-datasource-google@15.0.1/img/google/64/${codepoint}.png`;
  
  return (
    <img
      src={imageUrl}
      alt={emoji}
      className={`inline-block ${className}`}
      style={{ 
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        imageRendering: 'auto',
      }}
      role="img"
      aria-label={emoji}
    />
  );
}
