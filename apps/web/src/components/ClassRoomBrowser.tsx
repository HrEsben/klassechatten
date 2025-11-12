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
      <div className="flex justify-center items-center p-8">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg"></span>
          <div className="text-base-content">Indlæser klasser...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="alert alert-error">
          <svg className="w-6 h-6 stroke-current shrink-0" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Fejl: {error}</span>
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="hero min-h-[50vh]">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold">Ingen klasser endnu</h2>
            <p className="py-6 text-base-content/70">
              Du er ikke medlem af nogen klasser. Bed din lærer om en invitationskode.
            </p>
          </div>
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
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">Mine klasser</h2>
      
      <div className="space-y-4">
        {classes.map((classItem) => (
          <div 
            key={classItem.id}
            className="card bg-base-100 shadow-lg border border-base-300"
          >
            {/* Class header */}
            <div
              onClick={() => setExpandedClassId(
                expandedClassId === classItem.id ? null : classItem.id
              )}
              className="card-body cursor-pointer hover:bg-base-200/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="card-title text-xl">{classItem.label}</h3>
                  {classItem.school_name && (
                    <p className="text-base-content/70 text-sm mt-1">
                      {classItem.school_name}
                    </p>
                  )}
                </div>
                <div className="text-2xl text-base-content/50">
                  {expandedClassId === classItem.id ? '▼' : '▶'}
                </div>
              </div>
            </div>

            {/* Rooms list */}
            {expandedClassId === classItem.id && (
              <div className="card-body pt-0">
                <div className="divider my-2"></div>
                {classItem.rooms.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-base-content/70 italic">
                      Ingen chatrum endnu
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {classItem.rooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoomId(room.id)}
                        disabled={room.is_locked}
                        className={`btn w-full justify-between ${
                          room.is_locked 
                            ? 'btn-disabled' 
                            : 'btn-outline hover:btn-primary'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          #{room.name}
                          {room.is_locked && (
                            <span className="text-base-content/50">🔒</span>
                          )}
                        </span>
                        <span className="text-primary">→</span>
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
  );
}
