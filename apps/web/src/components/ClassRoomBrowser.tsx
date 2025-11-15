'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserClasses } from '@/hooks/useUserClasses';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import ChatRoom from './ChatRoom';

export default function ClassRoomBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { classes, loading, error } = useUserClasses();
  const { getCountForRoom } = useUnreadCounts();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

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
    <div className="w-full h-full overflow-y-auto">
      <div className="w-full max-w-7xl mx-auto px-12 py-8">
      {/* Current Class Header */}
      {selectedClass && (
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-4xl font-black uppercase tracking-tight text-base-content">
              {selectedClass.label}
            </h2>
            <div className="flex-1 h-px bg-base-content/10"></div>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {selectedClass.rooms.map((room) => {
            const unreadCount = getCountForRoom(room.id);
            
            return (
              <div key={room.id} className="indicator w-full">
                {/* Unread badge - only show if count > 0 */}
                {unreadCount > 0 && (
                  <span className="indicator-item badge badge-primary badge-sm font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                
                <button
                  onClick={() => handleSelectRoom(room.id)}
                  disabled={room.is_locked}
                  className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-base-content/10 transition-all duration-200 overflow-hidden w-full"
                >
                  {/* Accent bar */}
                  <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
                  
                  <div className="px-8 py-6 pl-10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black uppercase tracking-tight text-base-content">
                        # {room.name}
                      </h3>
                      {room.is_locked ? (
                        <svg className="w-5 h-5 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="square" strokeLinejoin="miter" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : (
                        <svg 
                          className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" 
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
