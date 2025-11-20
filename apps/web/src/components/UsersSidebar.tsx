import React, { useMemo } from 'react';
import { UserCard } from './shared';

interface SidebarUser {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  avatar_color?: string;
  typing?: boolean;
  last_seen?: string;
  online?: boolean;
}

interface UsersSidebarProps {
  users: SidebarUser[];
  onlineUserIds?: Set<string>;
  currentUserId?: string;
  className?: string;
}

export default function UsersSidebar({ 
  users, 
  onlineUserIds = new Set(),
  currentUserId,
  className = '' 
}: UsersSidebarProps) {
  // Separate and sort users by online status
  const { onlineUsers, offlineUsers, totalOnline } = useMemo(() => {
    const online: SidebarUser[] = [];
    const offline: SidebarUser[] = [];
    
    users.forEach(user => {
      const isOnline = onlineUserIds.has(user.user_id) || user.online;
      if (isOnline) {
        online.push({ ...user, online: true });
      } else {
        offline.push({ ...user, online: false });
      }
    });
    
    return {
      onlineUsers: online,
      offlineUsers: offline,
      totalOnline: online.length
    };
  }, [users, onlineUserIds]);

  if (users.length === 0) {
    return null;
  }

  const renderUser = (user: SidebarUser) => {
    const isCurrentUser = user.user_id === currentUserId;
    const isOnline = user.online;
    
    return (
      <li key={user.user_id}>
        <div className="relative">
          <UserCard
            user={{
              display_name: user.display_name,
              avatar_url: user.avatar_url,
              avatar_color: user.avatar_color,
            }}
            variant="compact"
            isOnline={isOnline}
            isCurrent={isCurrentUser}
            showRole={false}
          />
          {/* Typing indicator overlay */}
          {user.typing && (
            <div className="absolute bottom-0 left-16 text-xs text-base-content/40 font-mono pb-2">
              skriver...
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-base-200 lg:bg-base-200/60 border-r border-primary/10 ${className}`}>
      {/* Header - fixed height to match chat header */}
      <div className="flex-none px-4 h-[57px] border-b border-primary/10 flex items-center">
        <div className="flex items-center justify-between w-full">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-base-content/60">
              Brugere
            </div>
            <div className="text-sm text-base-content/40 font-light mt-1">
              {totalOnline} online · {users.length} total
            </div>
          </div>
          <label htmlFor="users-drawer" className="btn btn-ghost btn-sm btn-square lg:hidden text-base-content">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </label>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {onlineUsers.length > 0 && (
          <div>
            <div className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-base-content/50">
              Online
            </div>
            <ul className="menu p-2 pt-0">
              {onlineUsers.map(renderUser)}
            </ul>
          </div>
        )}
        
        {offlineUsers.length > 0 && (
          <div>
            <div className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-base-content/50">
              Offline
            </div>
            <ul className="menu p-2 pt-0">
              {offlineUsers.map(renderUser)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
