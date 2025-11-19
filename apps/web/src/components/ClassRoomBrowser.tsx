'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserClasses } from '@/hooks/useUserClasses';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useGuardianChildren } from '@/hooks/useGuardianChildren';
import { supabase } from '@/lib/supabase';
import { Flag, Settings, Info, Users, UserPlus, UserCheck, ArrowRight, ChevronRight } from 'lucide-react';
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
  
  // Check if guardian has children
  const { hasChildren, loading: loadingChildren } = useGuardianChildren();

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

  // High severity flagged count for badge on flag icon
  const [flaggedHighCount, setFlaggedHighCount] = useState(0);

  useEffect(() => {
    let aborted = false;
    async function fetchHighSeverityCount() {
      try {
        if (!canAccessSettings || !selectedClassId) {
          setFlaggedHighCount(0);
          return;
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session) return;
        const params = new URLSearchParams({ severity: 'high_severity' });
        if (selectedClass?.is_class_admin && selectedClass?.id) {
          params.append('class_id', selectedClass.id);
        }
        const res = await fetch(`/api/moderation/flagged-messages?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        if (!res.ok) {
          setFlaggedHighCount(0);
          return;
        }
        const data = await res.json();
        if (!aborted) {
          const messages = data.flagged_messages || [];
          setFlaggedHighCount(Array.isArray(messages) ? messages.length : 0);
        }
      } catch (_) {
        if (!aborted) setFlaggedHighCount(0);
      }
    }
    fetchHighSeverityCount();
    return () => {
      aborted = true;
    };
  }, [canAccessSettings, selectedClassId, selectedClass?.is_class_admin, selectedClass?.id]);

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
        <div className="mb-8">
          <div className="w-16 h-0.5 bg-primary/40 mx-auto mb-4"></div>
          <h2 className="text-2xl font-light tracking-wide text-base-content mb-4">Ingen klasser fundet</h2>
          <p className="text-base-content/60 font-light max-w-md mb-6">
            Du er ikke medlem af nogen klasser endnu.
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 max-w-2xl w-full">
          {/* Create Child Card */}
          <button
            onClick={() => router.push('/create-child')}
            className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
          >
            <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
            
            <div className="px-8 py-6 pl-10">
              <div className="flex items-start justify-between mb-3">
                <UserPlus className="w-8 h-8 text-primary" strokeWidth={2} />
              </div>
              
                  <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                    Opret Barn-konto
                  </h3>              <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                Første forælder: Opret konto til dit barn
              </p>
            </div>
          </button>

          {/* Claim Child Card */}
          <button
            onClick={() => router.push('/claim-child')}
            className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-accent transition-all duration-200 overflow-hidden"
          >
            <div className="absolute left-0 top-0 w-1 h-full bg-accent/30 group-hover:bg-accent group-hover:w-2 transition-all duration-200"></div>
            
            <div className="px-8 py-6 pl-10">
              <div className="flex items-start justify-between mb-3">
                <UserCheck className="w-8 h-8 text-accent" strokeWidth={2} />
              </div>
              
              <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                Brug Forældre-Kode
              </h3>
              
              <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                Anden forælder: Tilknyt dig et barn
              </p>
            </div>
          </button>

          {/* Join Class Card */}
          <button
            onClick={() => router.push('/onboarding')}
            className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-warning transition-all duration-200 overflow-hidden md:col-span-2"
          >
            <div className="absolute left-0 top-0 w-1 h-full bg-warning/30 group-hover:bg-warning group-hover:w-2 transition-all duration-200"></div>
            
            <div className="px-8 py-6 pl-10">
              <div className="flex items-start justify-between mb-3">
                <ArrowRight className="w-8 h-8 text-warning" strokeWidth={2} />
              </div>
              
              <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                Tilmeld Klasse
              </h3>
              
              <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                Lærer/Voksen: Brug invitationskode eller opret klasse
              </p>
            </div>
          </button>
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
            {/* Flagged messages icon for admins and class admins */}
            {canAccessSettings && (
              <div className="indicator">
                {flaggedHighCount > 0 && (
                  <span className="indicator-item badge badge-error badge-xs font-bold">
                    {flaggedHighCount}
                  </span>
                )}
                <button
                  onClick={() => {
                    // Global admins go to admin area, class admins stay in class context
                    if (profile?.role === 'admin') {
                      const params = new URLSearchParams();
                      if (selectedClass?.id) {
                        params.set('class_id', selectedClass.id);
                      }
                      router.push(`/admin/flagged-messages?${params.toString()}`);
                    } else {
                      // Class admins go to class-scoped flagged page
                      router.push(`/class/${selectedClass?.id}/flagged`);
                    }
                  }}
                  className="btn btn-ghost btn-square hover:text-warning"
                  aria-label="Flaggede beskeder"
                >
                  <Flag size={24} strokeWidth={2} className="stroke-current" />
                </button>
              </div>
            )}
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
                <Settings size={24} strokeWidth={2} className="stroke-current" />
              </button>
            )}
          </div>
          <p className="text-xs font-mono uppercase tracking-wider text-base-content/40">
            {selectedClass.rooms.length} {selectedClass.rooms.length === 1 ? 'Kanal' : 'Kanaler'}
            {selectedClass.school_name && ` • ${selectedClass.school_name}`}
          </p>
        </div>
      )}

      {/* Guardian No Children Banner */}
      {profile?.role === 'guardian' && !loadingChildren && !hasChildren && (
        <div className="mb-8 bg-info/10 border-2 border-info/20 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <Info className="w-8 h-8 stroke-current text-info shrink-0" strokeWidth={2} />
              <div className="flex-1">
                <h3 className="text-lg font-black uppercase tracking-tight text-base-content mb-2">
                  Hvem er dit barn?
                </h3>
                <p className="text-sm text-base-content/70 mb-4">
                  Vi kan se du endnu ikke er tilknyttet et barn i klassen. Opret en konto til dit barn eller tilknyt dit barn med en forælder-kode.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => router.push('/create-child')}
                    className="btn btn-sm bg-info text-info-content hover:bg-info/80"
                  >
                    Opret barn-konto
                  </button>
                  <button
                    onClick={() => router.push('/claim-child')}
                    className="btn btn-sm btn-ghost border-2 border-info/30 hover:border-info"
                  >
                    Brug forældre-kode
                  </button>
                </div>
              </div>
            </div>
          </div>
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
