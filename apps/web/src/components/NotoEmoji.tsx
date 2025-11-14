'use client';

import React from 'react';

interface NotoEmojiProps {
  emoji: string;
  size?: number;
  className?: string;
}

/**
 * NotoEmoji component renders Google's Noto Emoji as images
 * Berlin Edgy aesthetic: Sharp, clean, flat design
 * Uses emoji-datasource-google for consistent cross-platform rendering
 */
export default function NotoEmoji({ emoji, size = 16, className = '' }: NotoEmojiProps) {
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
