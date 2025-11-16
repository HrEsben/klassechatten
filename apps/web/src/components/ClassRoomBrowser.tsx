'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserClasses } from '@/hooks/useUserClasses';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useUserProfile } from '@/hooks/useUserProfile';
import ChatRoom from './ChatRoom';

export default function ClassRoomBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { classes, loading, error } = useUserClasses();
  const { getCountForRoom } = useUnreadCounts();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  
  // Get user profile to check admin status
  const { profile } = useUserProfile(selectedClassId || undefined);

  // Initialize from URL params
  useEffect(() => {
    const roomParam = searchParams.get('room');
    const classParam = searchParams.get('class');
    if (roomParam) {
      setSelectedRoomId(roomParam);
    }
    if (classParam) {
      setSelectedClassId(classParam);
    }
  }, [searchParams]);

  // Select first class by default when classes load
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
      router.push(`?class=${classes[0].id}`, { scroll: false });
    }
  }, [classes, selectedClassId, router]);

  // Handler to select a room and update URL
  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    router.push(`?class=${selectedClassId}&room=${roomId}`, { scroll: false });
  };

  // Handler to go back from room and restore class view
  const handleBack = () => {
    setSelectedRoomId(null);
    router.push(`?class=${selectedClassId}`, { scroll: false });
  };

  // Handler to switch classes
  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedRoomId(null);
    router.push(`?class=${classId}`, { scroll: false });
  };

  // Get currently selected class
  const selectedClass = classes.find(c => c.id === selectedClassId);
  
  // Check if user can access settings (global admin or class admin)
  const canAccessSettings = profile?.role === 'admin' || selectedClass?.is_class_admin;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-100/80">
        <div className="flex flex-col items-center gap-6">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <div className="text-base-content/60 font-light tracking-wide">Indlæser klasser...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-100/80">
        <div className="bg-error/10 border border-error/20 px-6 py-4 font-mono text-error text-sm">
          Fejl: {error}
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-100/80 text-center px-6">
        <div className="mb-6">
          <div className="w-16 h-0.5 bg-primary/40 mx-auto mb-4"></div>
          <h2 className="text-2xl font-light tracking-wide text-base-content mb-4">Ingen klasser fundet</h2>
          <p className="text-base-content/60 font-light max-w-md">
            Du er ikke medlem af nogen klasser endnu. Spørg din lærer om en invitationskode.
          </p>
        </div>
      </div>
    );
  }

  // If a room is selected, show the chat
  if (selectedRoomId) {
    return (
      <div className="h-full w-full bg-base-300">
        <ChatRoom 
          roomId={selectedRoomId}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8">
      {/* Current Class Header */}
      {selectedClass && (
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-4xl font-black uppercase tracking-tight text-base-content truncate">
              {selectedClass.nickname || selectedClass.label}
            </h2>
            <div className="flex-1 h-px bg-base-content/10"></div>
            {/* Settings icon for admins and class admins */}
            {canAccessSettings && (
              <button
                onClick={() => {
                  console.log('[ClassRoomBrowser] Navigating to settings with class ID:', selectedClass.id);
                  console.log('[ClassRoomBrowser] Full selectedClass object:', selectedClass);
                  router.push(`/class/${selectedClass.id}/settings`);
                }}
                className="btn btn-ghost btn-square"
                aria-label="Indstillinger"
              >
                <svg className="w-6 h-6 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-xs font-mono uppercase tracking-wider text-base-content/40">
            {selectedClass.rooms.length} {selectedClass.rooms.length === 1 ? 'Kanal' : 'Kanaler'}
            {selectedClass.school_name && ` • ${selectedClass.school_name}`}
          </p>
        </div>
      )}

      {/* Channels Grid */}
      {selectedClass && selectedClass.rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6">
            <div className="w-16 h-0.5 bg-primary/40 mx-auto mb-4"></div>
            <p className="text-base-content/60 font-light max-w-md">
              Ingen kanaler tilgængelige i denne klasse endnu.
            </p>
          </div>
        </div>
      ) : selectedClass ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {selectedClass.rooms.map((room) => {
            const unreadCount = getCountForRoom(room.id);
            
            return (
              <div key={room.id} className="relative w-full min-w-0">
                {/* Unread badge - only show if count > 0 */}
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 badge badge-primary badge-sm font-bold z-10">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                
                <button
                  onClick={() => handleSelectRoom(room.id)}
                  disabled={room.is_locked}
                  className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-base-content/10 transition-all duration-200 overflow-hidden w-full min-w-0"
                >
                  {/* Accent bar */}
                  <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
                  
                  <div className="px-4 py-6 pl-6 sm:px-8 sm:pl-10">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-base-content truncate min-w-0">
                        # {room.name}
                      </h3>
                      {room.is_locked ? (
                        <svg className="w-5 h-5 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="square" strokeLinejoin="miter" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : (
                        <svg 
                          className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 shrink-0" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
      </div>
    </div>
  );
}
