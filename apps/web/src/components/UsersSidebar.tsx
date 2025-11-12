import React from 'react';
import Avatar from './Avatar';

interface SidebarUser {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  avatar_color?: string;
  typing?: boolean;
  last_seen?: string;
}

interface UsersSidebarProps {
  users: SidebarUser[];
  currentUserId?: string;
  className?: string;
}

export default function UsersSidebar({ 
  users, 
  currentUserId,
  className = '' 
}: UsersSidebarProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col h-full bg-base-200/60 border-r border-primary/10 ${className}`}>
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b border-primary/10">
        <div className="font-mono text-xs uppercase tracking-wider text-base-content/60">
          Online Users
        </div>
        <div className="text-sm text-base-content/40 font-light mt-1">
          {users.length} {users.length === 1 ? 'user' : 'users'}
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        <ul className="menu p-2">
          {users.map((user) => {
            const isCurrentUser = user.user_id === currentUserId;
            
            return (
              <li key={user.user_id}>
                <div className={`flex items-center gap-3 py-3 px-3 ${isCurrentUser ? 'bg-primary/5' : ''}`}>
                  <Avatar
                    user={{
                      display_name: user.display_name,
                      avatar_url: user.avatar_url,
                      avatar_color: user.avatar_color,
                    }}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-base-content truncate">
                      {user.display_name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-base-content/50 font-light">(dig)</span>
                      )}
                    </div>
                    {user.typing && (
                      <div className="text-xs text-base-content/40 font-mono">skriver...</div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
