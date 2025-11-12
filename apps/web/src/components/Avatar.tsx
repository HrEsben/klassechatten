import React from 'react';

interface AvatarProps {
  user?: {
    display_name?: string;
    avatar_url?: string;
    avatar_color?: string;
  };
  size?: number;
  style?: React.CSSProperties;
}

export default function Avatar({ user, size = 40, style }: AvatarProps) {
  const displayName = user?.display_name || 'U';
  const avatarUrl = user?.avatar_url;
  const avatarColor = user?.avatar_color || '#3B82F6';
  
  // Get initials from display name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const avatarStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: size / 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${displayName} avatar`}
        style={avatarStyle}
        onError={(e) => {
          // Fallback to initials if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    );
  }

  // Fallback to colored circle with initials
  return (
    <div
      style={{
        ...avatarStyle,
        backgroundColor: avatarColor,
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: size * 0.4,
        textAlign: 'center',
      }}
    >
      {getInitials(displayName)}
    </div>
  );
}