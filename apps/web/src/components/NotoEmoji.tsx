'use client';

import React, { useState } from 'react';

interface NotoEmojiProps {
  emoji: string;
  size?: number;
  className?: string;
}

/**
 * NotoEmoji component renders Google's Noto Emoji as images
 * Berlin Edgy aesthetic: Sharp, clean, flat design
 * Uses emoji-datasource-google for consistent cross-platform rendering
 * Falls back to native emoji if image fails to load
 */
export default function NotoEmoji({ emoji, size = 16, className = '' }: NotoEmojiProps) {
  const [imgError, setImgError] = useState(false);
  
  // Convert emoji to Unicode codepoint
  const codepoint = Array.from(emoji)
    .map(char => {
      const code = char.codePointAt(0);
      if (!code) return '';
      return code.toString(16).toLowerCase();
    })
    .filter(Boolean)
    .join('-');
  
  // Use emoji-datasource-google CDN for Noto emoji images
  const imageUrl = `https://cdn.jsdelivr.net/npm/emoji-datasource-google@15.0.1/img/google/64/${codepoint}.png`;
  
  // Fallback to native emoji if image fails to load
  if (imgError) {
    return (
      <span
        className={`inline-block ${className}`}
        style={{ 
          fontSize: `${size}px`,
          lineHeight: 1,
          verticalAlign: 'middle',
        }}
        role="img"
        aria-label={emoji}
      >
        {emoji}
      </span>
    );
  }
  
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
      onError={() => setImgError(true)}
      role="img"
      aria-label={emoji}
    />
  );
}
