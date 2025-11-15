'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();

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

  return (
    <div className="dropdown dropdown-end">
      {/* Bell Button with Badge */}
      <div tabIndex={0} role="button" className="btn btn-ghost btn-square relative">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="square" strokeLinejoin="miter" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="indicator-item badge badge-primary badge-sm font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {/* Dropdown Content */}
      <div
        tabIndex={-1}
        className="dropdown-content menu bg-base-100 border-2 border-base-content/10 z-50 w-96 shadow-lg mt-2"
        style={{ maxHeight: '32rem' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-base-100 border-b-2 border-base-content/10 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="text-sm font-black uppercase tracking-tight text-base-content">
            Notifikationer
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-bold uppercase tracking-widest text-primary hover:text-primary-focus"
            >
              Markér alle som læst
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto" style={{ maxHeight: '28rem' }}>
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 stroke-current text-base-content/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="square" strokeLinejoin="miter" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm text-base-content/60">
                Ingen notifikationer endnu
              </p>
            </div>
          ) : (
            <ul className="menu p-0">
              {notifications.map((notification) => (
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
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
