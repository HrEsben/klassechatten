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
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Indlæser klasser...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', color: '#dc3545' }}>
        Fejl: {error}
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Ingen klasser endnu</h2>
        <p style={{ color: '#666', marginTop: '1rem' }}>
          Du er ikke medlem af nogen klasser. Bed din lærer om en invitationskode.
        </p>
      </div>
    );
  }

  // If a room is selected, show the chat
  if (selectedRoomId) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          padding: '1rem', 
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <button
            onClick={() => setSelectedRoomId(null)}
            style={{
              padding: '0.5rem 1rem',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ← Tilbage
          </button>
          <h3 style={{ margin: 0 }}>Chat</h3>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatRoom roomId={selectedRoomId} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem' }}>Mine klasser</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {classes.map((classItem) => (
          <div 
            key={classItem.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* Class header */}
            <div
              onClick={() => setExpandedClassId(
                expandedClassId === classItem.id ? null : classItem.id
              )}
              style={{
                padding: '1rem',
                background: '#f8f9fa',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>{classItem.label}</h3>
                {classItem.school_name && (
                  <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.875rem' }}>
                    {classItem.school_name}
                  </p>
                )}
              </div>
              <span style={{ fontSize: '1.5rem' }}>
                {expandedClassId === classItem.id ? '▼' : '▶'}
              </span>
            </div>

            {/* Rooms list */}
            {expandedClassId === classItem.id && (
              <div style={{ padding: '1rem' }}>
                {classItem.rooms.length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>
                    Ingen chatrum endnu
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {classItem.rooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoomId(room.id)}
                        disabled={room.is_locked}
                        style={{
                          padding: '0.75rem 1rem',
                          background: room.is_locked ? '#e9ecef' : 'white',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          textAlign: 'left',
                          cursor: room.is_locked ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>
                          #{room.name}
                          {room.is_locked && (
                            <span style={{ marginLeft: '0.5rem', color: '#999' }}>🔒</span>
                          )}
                        </span>
                        <span style={{ color: '#007bff' }}>→</span>
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
