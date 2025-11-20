/**
 * UserAvatar - Shared user avatar component
 * Berlin Edgy design with square avatars, no rounded corners
 */

interface UserAvatarProps {
  /** Display name for initials fallback */
  displayName: string;
  /** Avatar image URL (optional) */
  avatarUrl?: string | null;
  /** Avatar background color (hex) */
  avatarColor?: string | null;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Additional CSS classes */
  className?: string;
}

export default function UserAvatar({
  displayName,
  avatarUrl,
  avatarColor = '#6247f5',
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-20 h-20 text-3xl',
    '2xl': 'w-32 h-32 text-4xl',
  };

  const sizeClass = sizeClasses[size];

  if (avatarUrl) {
    return (
      <div className={`${sizeClass} overflow-hidden ${className}`}>
        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center text-white font-black ${className}`}
      style={{ backgroundColor: avatarColor || '#6247f5' }}
    >
      {getInitials(displayName)}
    </div>
  );
}
