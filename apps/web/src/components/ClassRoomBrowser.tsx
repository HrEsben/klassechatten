'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserClasses } from '@/hooks/useUserClasses';
import ChatRoom from './ChatRoom';

export default function ClassRoomBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { classes, loading, error } = useUserClasses();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  // Initialize from URL params
  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam) {
      setSelectedRoomId(roomParam);
    }
  }, [searchParams]);

  // Expand first class by default when classes load
  useEffect(() => {
    if (classes.length > 0 && !expandedClassId) {
      setExpandedClassId(classes[0].id);
    }
  }, [classes, expandedClassId]);

  // Handler to select a room and update URL
  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    router.push(`?room=${roomId}`, { scroll: false });
  };

  // Handler to go back from room and clear URL
  const handleBack = () => {
    setSelectedRoomId(null);
    router.push('/', { scroll: false });
  };

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
      <div className="fixed inset-0 top-[73px] bottom-[57px] flex flex-col z-10 bg-base-300">
        <div className="flex-1 overflow-hidden">
          <ChatRoom 
            roomId={selectedRoomId}
            onBack={handleBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with Berlin Edgy style */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-4xl font-black uppercase tracking-tight text-base-content">
            Klasser
          </h2>
          <div className="flex-1 h-px bg-base-content/10"></div>
        </div>
        <p className="text-xs font-mono uppercase tracking-wider text-base-content/40">
          Vælg en klasse for at se kanaler
        </p>
      </div>
      
      {/* Classes Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {classes.map((classItem) => (
          <div 
            key={classItem.id}
            className="relative group"
          >
            {/* Accent glow effect */}
            <div className="absolute -inset-0.5 bg-linear-to-r from-primary to-secondary opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
            
            <div className="relative bg-base-100 border-2 border-base-content/10 group-hover:border-primary/50 transition-colors duration-300">
              {/* Class header */}
              <div
                onClick={() => setExpandedClassId(
                  expandedClassId === classItem.id ? null : classItem.id
                )}
                className="px-8 py-6 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-2">
                      {classItem.label}
                    </h3>
                    {classItem.school_name && (
                      <p className="text-xs font-mono uppercase tracking-wider text-base-content/40">
                        {classItem.school_name}
                      </p>
                    )}
                  </div>
                  <div 
                    className="text-base-content/40 transition-transform duration-300 mt-1" 
                    style={{
                      transform: expandedClassId === classItem.id ? 'rotate(90deg)' : 'rotate(0deg)'
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                {/* Channel count badge */}
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary"></div>
                  <span className="text-xs font-bold uppercase tracking-widest text-base-content/60">
                    {classItem.rooms.length} {classItem.rooms.length === 1 ? 'Kanal' : 'Kanaler'}
                  </span>
                </div>
              </div>

              {/* Rooms list */}
              {expandedClassId === classItem.id && (
                <div className="bg-base-200/30">
                  <div className="px-8 py-6">
                    {classItem.rooms.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-xs font-mono uppercase tracking-wider text-base-content/40">
                          Ingen kanaler tilgængelige
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {classItem.rooms.map((room) => (
                          <button
                            key={room.id}
                            onClick={() => handleSelectRoom(room.id)}
                            disabled={room.is_locked}
                            className="w-full px-6 py-4 text-left bg-base-100 hover:bg-base-100 border-l-4 border-primary/30 hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-primary/30 transition-all duration-200 group/room shadow-sm hover:shadow-md"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-1 h-6 bg-primary group-hover/room:h-8 transition-all duration-200"></div>
                                <span className="text-sm font-bold uppercase tracking-wider text-base-content">
                                  # {room.name}
                                </span>
                                {room.is_locked && (
                                  <svg className="w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="square" strokeLinejoin="miter" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                )}
                              </div>
                              <svg 
                                className="w-4 h-4 text-primary opacity-0 group-hover/room:opacity-100 group-hover/room:translate-x-1 transition-all duration-200" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                              >
                                <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
