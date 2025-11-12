import React from 'react';
import Avatar from './Avatar';

interface OnlineUser {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  avatar_color?: string;
  typing?: boolean;
  last_seen?: string;
}

interface OnlineUsersProps {
  users: OnlineUser[];
  maxVisible?: number;
  className?: string;
}

export default function OnlineUsers({ 
  users, 
  maxVisible = 5, 
  className = '' 
}: OnlineUsersProps) {
  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  if (users.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Avatar group */}
      <div className="avatar-group -space-x-2">
        {visibleUsers.map((user) => (
          <div key={user.user_id} className="tooltip" data-tip={user.display_name}>
            <Avatar
              user={{
                display_name: user.display_name,
                avatar_url: user.avatar_url,
                avatar_color: user.avatar_color,
              }}
              online={true}
              size="sm"
            />
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="avatar avatar-placeholder">
            <div className="w-8 h-8 bg-neutral text-neutral-content rounded-full">
              <span className="text-xs">+{remainingCount}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Online count text */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-base-content/70">
          {users.length} online
        </span>
        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
      </div>
    </div>
  );
}