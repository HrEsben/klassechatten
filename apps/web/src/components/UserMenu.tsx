'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useUserClasses } from '@/hooks/useUserClasses';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Users, UserPlus, UserCheck, LogOut, MessageSquare, AtSign, Smile, AlertTriangle, Info as InfoIcon, ChevronRight, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

interface UserMenuProps {
  userName: string | null | undefined;
  userRole: string;
  avatarUrl?: string | null;
}

interface Child {
  child_id: string;
  child_name: string;
  child_username: string;
}

export default function UserMenu({ userName, userRole, avatarUrl }: UserMenuProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { classes } = useUserClasses();
  const classParam = searchParams.get('class');
  const { profile } = useUserProfile(classParam || undefined);
  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  const isGlobalAdmin = profile?.role === 'admin';
  const selectedClass = classes.find(c => c.id === classParam);
  const isClassAdmin = selectedClass?.is_class_admin;

  // Load children for guardians
  useEffect(() => {
    if (profile?.role === 'guardian') {
      loadChildren();
    }
  }, [profile?.role]);

  const loadChildren = async () => {
    setLoadingChildren(true);
    try {
      const response = await fetch('/api/guardians/my-children');
      const data = await response.json();
      if (response.ok) {
        setChildren(data.children);
      }
    } catch (err) {
      console.error('Error loading children:', err);
    } finally {
      setLoadingChildren(false);
    }
  };

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
      <div
        tabIndex={-1}
        className="dropdown-content bg-base-100 border-2 border-base-content/10 z-50 shadow-lg mt-3 p-0"
        style={{ width: '600px' }}
      >
        {/* User Info Header - Full Width */}
        <button
          onClick={() => {
            router.push('/profile');
            (document.activeElement as HTMLElement)?.blur();
          }}
          className="w-full border-b-2 border-base-content/10 px-6 py-4 hover:bg-base-200 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-black uppercase tracking-tight text-base-content">
                {userName || 'Bruger'}
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                {userRole}
              </span>
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-base-content/40">
              Profil →
            </div>
          </div>
        </button>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 divide-x-2 divide-base-content/10">
          
          {/* Left Column - Notifications */}
          <div className="flex flex-col" style={{ maxHeight: '28rem' }}>
            {notifications.length > 0 ? (
              <>
                <div className="border-b-2 border-base-content/10 px-4 py-3 flex items-center justify-between">
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
                </div>
                
                {/* Notifications List - Scrollable */}
                <div className="overflow-y-auto flex-1">
                  {notifications.slice(0, 5).map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`relative w-full px-4 py-3 text-left hover:bg-base-200 border-b border-base-content/5 ${
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
                  ))}
                </div>
              </>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-base-content/60">Ingen notifikationer</p>
              </div>
            )}
          </div>

          {/* Right Column - Guardian Navigation + Logout */}
          <div className="flex flex-col" style={{ maxHeight: '28rem' }}>
            {profile?.role === 'guardian' && (
              <>
                {/* Children List Section */}
                <div className="border-b-2 border-base-content/10 px-4 py-3">
                  <span className="text-xs font-black uppercase tracking-tight text-base-content">
                    Mine Børn
                  </span>
                </div>
                
                <div className="flex flex-col flex-1 overflow-y-auto">
                  {loadingChildren ? (
                    <div className="px-4 py-8 text-center">
                      <span className="loading loading-ball loading-sm text-primary"></span>
                    </div>
                  ) : children.length > 0 ? (
                    children.map((child) => (
                      <button
                        key={child.child_id}
                        onClick={() => {
                          // Validate UUID before navigation
                          if (!child.child_id || child.child_id.includes('%%') || child.child_id.includes('drp:')) {
                            console.error('[UserMenu] Invalid child_id detected:', child.child_id);
                            console.log('[UserMenu] Full child object:', child);
                            alert('Fejl: Ugyldig barn-ID. Prøv at genindlæse siden.');
                            return;
                          }
                          
                          // Store child info in sessionStorage as backup (with obfuscated key to avoid redaction)
                          try {
                            sessionStorage.setItem('current_child_profile', JSON.stringify({
                              id: child.child_id,
                              name: child.child_name,
                              username: child.child_username,
                              timestamp: Date.now()
                            }));
                          } catch (e) {
                            console.error('[UserMenu] Failed to store child info:', e);
                          }
                          
                          // Use query parameter as fallback to avoid URL path redaction
                          router.push(`/child/${child.child_id}?cid=${encodeURIComponent(child.child_id)}`);
                          (document.activeElement as HTMLElement)?.blur();
                        }}
                        className="px-4 py-3 hover:bg-primary/10 text-left flex items-center justify-between border-b border-base-content/5 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="w-8 h-8 bg-primary/20 text-primary">
                              <span className="text-sm font-black">
                                {child.child_name?.[0]?.toUpperCase() || child.child_username?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-base-content">
                              {child.child_name || child.child_username || 'Barn'}
                            </div>
                            <div className="text-xs text-base-content/60">
                              @{child.child_username || 'ingen_brugernavn'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-base-content/40 group-hover:text-primary transition-colors" strokeWidth={2} />
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-xs text-base-content/60">Ingen børn endnu</p>
                    </div>
                  )}

                  {/* Add Child Section */}
                  <div className="mt-auto border-t-2 border-base-content/10">
                    <button
                      onClick={() => setShowAddMenu(!showAddMenu)}
                      className="w-full px-4 py-3 hover:bg-accent/10 text-left flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Plus className="w-5 h-5 text-accent" strokeWidth={2} />
                        <span className="text-sm font-medium text-accent">Tilføj Barn</span>
                      </div>
                      <ChevronRight 
                        className={`w-4 h-4 text-accent transition-transform ${showAddMenu ? 'rotate-90' : ''}`} 
                        strokeWidth={2} 
                      />
                    </button>
                    
                    {showAddMenu && (
                      <div className="bg-base-200/50">
                        <button
                          onClick={() => {
                            router.push('/create-child');
                            (document.activeElement as HTMLElement)?.blur();
                          }}
                          className="w-full px-4 py-2 pl-12 hover:bg-primary/10 text-left flex items-center gap-3 border-b border-base-content/5"
                        >
                          <UserPlus className="w-4 h-4" strokeWidth={2} />
                          <span className="text-sm">Opret Barn-konto</span>
                        </button>

                        <button
                          onClick={() => {
                            router.push('/claim-child');
                            (document.activeElement as HTMLElement)?.blur();
                          }}
                          className="w-full px-4 py-2 pl-12 hover:bg-accent/10 text-left flex items-center gap-3"
                        >
                          <UserCheck className="w-4 h-4" strokeWidth={2} />
                          <span className="text-sm">Brug Forældre-kode</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {/* Logout - Always at bottom */}
            <button
              onClick={handleSignOut}
              className="mt-auto px-4 py-3 hover:bg-error/10 hover:text-error font-medium text-left flex items-center gap-3 border-t-2 border-base-content/10"
            >
              <LogOut className="w-5 h-5" strokeWidth={2} />
              <span className="text-sm">Log Ud</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
