import React from 'react';
import UserAvatar from './UserAvatar';
import { LucideIcon } from 'lucide-react';

interface UserCardProps {
  user: {
    display_name: string;
    avatar_url?: string | null;
    avatar_color?: string | null;
    email?: string;
    username?: string;
    role?: string;
  };
  /** Card variant */
  variant?: 'default' | 'compact' | 'list';
  /** Show online indicator */
  isOnline?: boolean;
  /** Highlight as current user */
  isCurrent?: boolean;
  /** Show role badge */
  showRole?: boolean;
  /** Role badge color class */
  roleBadgeColor?: string;
  /** Role label text */
  roleLabel?: string;
  /** Additional action buttons */
  actions?: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * UserCard - Consistent user display component
 * 
 * @example
 * // List item variant (default)
 * <UserCard
 *   user={{ display_name: "John Doe", email: "john@example.com" }}
 *   showRole
 *   roleLabel="Elev"
 *   roleBadgeColor="badge-info"
 * />
 * 
 * @example
 * // Compact variant (for sidebar)
 * <UserCard
 *   user={user}
 *   variant="compact"
 *   isOnline={true}
 *   isCurrent={user.id === currentUserId}
 * />
 * 
 * @example
 * // With actions
 * <UserCard
 *   user={user}
 *   actions={
 *     <button className="btn btn-xs btn-ghost">Remove</button>
 *   }
 * />
 */
export function UserCard({
  user,
  variant = 'default',
  isOnline = false,
  isCurrent = false,
  showRole = false,
  roleBadgeColor = 'badge-info',
  roleLabel,
  actions,
  onClick,
  className = '',
}: UserCardProps) {
  const isClickable = !!onClick;

  const baseClass = variant === 'compact' 
    ? 'flex items-center gap-3 py-3 px-3' 
    : 'flex items-center gap-3 py-4 px-4';

  const interactiveClass = isClickable 
    ? 'hover:bg-base-200 cursor-pointer transition-colors' 
    : '';

  const currentUserClass = isCurrent ? 'bg-primary/5' : '';

  const containerClass = `${baseClass} ${interactiveClass} ${currentUserClass} ${className}`;

  const Component = isClickable ? 'button' : 'div';

  return (
    <Component 
      className={containerClass}
      onClick={onClick}
      {...(isClickable && { type: 'button' })}
    >
      {/* Avatar with online indicator */}
      <div className="indicator">
        <UserAvatar
          displayName={user.display_name}
          avatarUrl={user.avatar_url}
          avatarColor={user.avatar_color}
          size={variant === 'compact' ? 'sm' : 'md'}
        />
        {isOnline && (
          <span className="indicator-item badge badge-xs badge-success border-base-200"></span>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="text-sm font-medium text-base-content truncate">
          {user.display_name}
          {isCurrent && (
            <span className="ml-2 text-xs text-base-content/50 font-light">(dig)</span>
          )}
        </div>
        {(user.email || user.username) && (
          <div className="text-xs text-base-content/60 truncate">
            {user.username ? `@${user.username}` : user.email}
          </div>
        )}
      </div>

      {/* Role Badge */}
      {showRole && roleLabel && (
        <span className={`badge ${roleBadgeColor} badge-sm font-bold uppercase`}>
          {roleLabel}
        </span>
      )}

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </Component>
  );
}
