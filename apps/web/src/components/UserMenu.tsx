'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useUserClasses } from '@/hooks/useUserClasses';
import { useUserProfile } from '@/hooks/useUserProfile';

interface UserMenuProps {
  userName: string | null | undefined;
  userRole: string;
  avatarUrl?: string | null;
}

export default function UserMenu({ userName, userRole, avatarUrl }: UserMenuProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { classes } = useUserClasses();
  const classParam = searchParams.get('class');
  const { profile } = useUserProfile(classParam || undefined);
  
  const isGlobalAdmin = profile?.role === 'admin';
  const selectedClass = classes.find(c => c.id === classParam);
  const isClassAdmin = selectedClass?.is_class_admin;

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate to relevant location
    if (notification.room_id && notification.class_id) {
      router.push(`?class=${notification.class_id}&room=${notification.room_id}`);
    }

    // Close dropdown
    (document.activeElement as HTMLElement)?.blur();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_message':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="square" strokeLinejoin="miter" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'mention':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="square" strokeLinejoin="miter" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
        );
      case 'reaction':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="square" strokeLinejoin="miter" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'moderation':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="square" strokeLinejoin="miter" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Get user initials for avatar placeholder
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="dropdown dropdown-end">
      {/* Avatar Button with Badge */}
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
        <div className="w-10 rounded-full">
          {avatarUrl ? (
            <img alt={userName || 'User'} src={avatarUrl} />
          ) : (
            <div className="bg-primary text-primary-content w-full h-full flex items-center justify-center font-black text-sm">
              {getInitials(userName)}
            </div>
          )}
        </div>
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="indicator-item badge badge-primary badge-sm font-bold absolute -top-2 -right-2">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {/* Dropdown Menu */}
      <ul
        tabIndex={-1}
        className="menu menu-sm dropdown-content bg-base-100 border-2 border-base-content/10 z-50 w-80 sm:w-md shadow-lg mt-3 p-0"
        style={{ maxHeight: '32rem' }}
      >
        {/* User Info Header - Clickable */}
        <li>
          <button
            onClick={() => {
              router.push('/profile');
              (document.activeElement as HTMLElement)?.blur();
            }}
            className="border-b-2 border-base-content/10 px-4 py-3 hover:bg-base-200 transition-colors"
          >
            <div className="flex flex-col gap-1 items-start">
              <span className="text-sm font-black uppercase tracking-tight text-base-content">
                {userName || 'Bruger'}
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                {userRole}
              </span>
            </div>
          </button>
        </li>

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <>
            <li className="menu-title border-b-2 border-base-content/10 px-4 py-2 flex flex-row items-center justify-between">
              <span className="text-xs font-black uppercase tracking-tight text-base-content">
                Notifikationer
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  className="text-xs font-bold uppercase tracking-widest text-primary hover:text-primary-focus"
                >
                  Markér alle
                </button>
              )}
            </li>
            
            {/* Notifications List - Scrollable */}
            <div className="overflow-y-auto" style={{ maxHeight: '16rem' }}>
              {notifications.slice(0, 5).map((notification) => (
                <li key={notification.id}>
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className={`relative px-4 py-3 text-left hover:bg-base-200 border-b border-base-content/5 ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Unread indicator */}
                    {!notification.read && (
                      <div className="absolute left-0 top-0 w-1 h-full bg-primary"></div>
                    )}

                    <div className="flex gap-3 pl-2">
                      {/* Icon */}
                      <div className={`shrink-0 ${
                        notification.type === 'new_message' ? 'text-primary' :
                        notification.type === 'mention' ? 'text-secondary' :
                        notification.type === 'reaction' ? 'text-accent' :
                        notification.type === 'moderation' ? 'text-warning' :
                        'text-info'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-base-content mb-1 truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-base-content/60 mb-2 line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="text-xs font-mono uppercase tracking-wider text-base-content/40">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: da,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </div>
            
            <li className="border-t-2 border-base-content/10"></li>
          </>
        )}

        {/* Logout Option */}
        <li>
          <button
            onClick={handleSignOut}
            className="px-4 py-3 hover:bg-error/10 hover:text-error font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="square" strokeLinejoin="miter" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Ud
          </button>
        </li>
      </ul>
    </div>
  );
}
