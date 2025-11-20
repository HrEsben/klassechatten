/**
 * UserAvatar - Shared user avatar component
 * Berlin Edgy design with square avatars using DaisyUI classes
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
  /** Online status indicator */
  online?: boolean;
}

export default function UserAvatar({
  displayName,
  avatarUrl,
  avatarColor = '#6247f5',
  size = 'md',
  className = '',
  online = false,
}: UserAvatarProps) {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // DaisyUI avatar size mapping (width in rem)
  const sizeMap = {
    xs: 'w-6',   // 24px
    sm: 'w-8',   // 32px
    md: 'w-10',  // 40px
    lg: 'w-16',  // 64px
    xl: 'w-20',  // 80px
    '2xl': 'w-32', // 128px
  };

  // Font sizes for initials
  const fontSizeMap = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
    xl: 'text-3xl',
    '2xl': 'text-4xl',
  };

  const sizeClass = sizeMap[size];
  const fontSize = fontSizeMap[size];

  return (
    <div className={`avatar ${online ? 'online' : ''} ${className}`}>
      {avatarUrl ? (
        <div className={sizeClass}>
          <img src={avatarUrl} alt={displayName} />
        </div>
      ) : (
        <div 
          className={`avatar-placeholder ${sizeClass}`}
          style={{ backgroundColor: avatarColor || '#6247f5' }}
        >
          <span className={`${fontSize} text-white font-black`}>
            {getInitials(displayName)}
          </span>
        </div>
      )}
    </div>
  );
}
