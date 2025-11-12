'use client';

import { useState } from 'react';
import { useUserClasses } from '@/hooks/useUserClasses';
import ChatRoom from './ChatRoom';

export default function ClassRoomBrowser() {
  const { classes, loading, error } = useUserClasses();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-100/80">
        <div className="flex flex-col items-center gap-6">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <div className="text-base-content/60 font-light tracking-wide">Loading classes...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-100/80">
        <div className="bg-error/10 border border-error/20 px-6 py-4 font-mono text-error text-sm">
          Error: {error}
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-100/80 text-center px-6">
        <div className="mb-6">
          <div className="w-16 h-0.5 bg-primary/40 mx-auto mb-4"></div>
          <h2 className="text-2xl font-light tracking-wide text-base-content mb-4">No classes found</h2>
          <p className="text-base-content/60 font-light max-w-md">
            You&apos;re not a member of any classes yet. Ask your teacher for an invitation code.
          </p>
        </div>
      </div>
    );
  }

  // If a room is selected, show the chat
  if (selectedRoomId) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ChatRoom 
            roomId={selectedRoomId}
            onBack={() => setSelectedRoomId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-100/80 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-12 h-0.5 bg-primary/60 mx-auto mb-4"></div>
          <h2 className="text-2xl font-light tracking-wide text-base-content">Classes</h2>
        </div>
        
        {/* Classes List */}
        <div className="space-y-4">
          {classes.map((classItem) => (
            <div 
              key={classItem.id}
              className="bg-base-100/60 border border-primary/10 backdrop-blur-sm"
            >
              {/* Class header */}
              <div
                onClick={() => setExpandedClassId(
                  expandedClassId === classItem.id ? null : classItem.id
                )}
                className="p-6 cursor-pointer hover:bg-base-200/30 transition-colors duration-200"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-light tracking-wide text-base-content">{classItem.label}</h3>
                    {classItem.school_name && (
                      <p className="text-base-content/50 text-sm font-light mt-1">
                        {classItem.school_name}
                      </p>
                    )}
                  </div>
                  <div className="text-base-content/40 transition-transform duration-200" style={{
                    transform: expandedClassId === classItem.id ? 'rotate(90deg)' : 'rotate(0deg)'
                  }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Rooms list */}
              {expandedClassId === classItem.id && (
                <div className="px-6 pb-6">
                  <div className="w-full h-px bg-base-300/50 mb-6"></div>
                  {classItem.rooms.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-base-content/40 font-light text-sm">
                        No channels available
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {classItem.rooms.map((room) => (
                        <button
                          key={room.id}
                          onClick={() => setSelectedRoomId(room.id)}
                          disabled={room.is_locked}
                          className="w-full p-4 text-left bg-base-200/30 hover:bg-base-200/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-3">
                              <span className="text-base-content/60 font-light text-sm">#{room.name}</span>
                              {room.is_locked && (
                                <svg className="w-3 h-3 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              )}
                            </span>
                            <svg className="w-3 h-3 text-primary/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
