import React from 'react';

interface AvatarProps {
  user?: {
    display_name?: string;
    avatar_url?: string;
    avatar_color?: string;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  online?: boolean;
  offline?: boolean;
  placeholder?: boolean;
  className?: string;
}

export default function Avatar({ 
  user, 
  size, 
  online = false, 
  offline = false,
  placeholder = false,
  className = '' 
}: AvatarProps) {
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

  // Build DaisyUI classes
  const avatarClasses = ['avatar'];
  if (online) avatarClasses.push('avatar-online');
  if (offline) avatarClasses.push('avatar-offline');
  if (placeholder) avatarClasses.push('avatar-placeholder');
  
  // Size classes for DaisyUI
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8', 
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const sizeClass = typeof size === 'string' && sizeClasses[size] 
    ? sizeClasses[size] 
    : 'w-10 h-10'; // default to md

  const customSizeStyle = typeof size === 'number' ? {
    width: `${size}px`,
    height: `${size}px`
  } : {};

  if (avatarUrl) {
    return (
      <div className={`${avatarClasses.join(' ')} ${className}`}>
        <div className={`rounded-full ${sizeClass}`} style={customSizeStyle}>
          <img
            src={avatarUrl}
            alt={`${displayName} avatar`}
            onError={(e) => {
              // Fallback to initials if image fails to load
              console.log('Avatar image failed to load, will show initials');
            }}
          />
        </div>
      </div>
    );
  }

  // Fallback to placeholder with initials
  return (
    <div className={`${avatarClasses.join(' ')} avatar-placeholder ${className}`}>
      <div 
        className={`rounded-full text-neutral-content ${sizeClass}`}
        style={{ backgroundColor: avatarColor, ...customSizeStyle }}
      >
        <span className="text-xs font-semibold">
          {getInitials(displayName)}
        </span>
      </div>
    </div>
  );
}