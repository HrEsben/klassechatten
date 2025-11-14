'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ClassRoomBrowser from '@/components/ClassRoomBrowser';
import AdminDashboard from '@/components/AdminDashboard';
import { useUserClasses } from '@/hooks/useUserClasses';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ThemeController } from '@/components/ThemeController';

function HomePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { classes } = useUserClasses();
  
  const classParam = searchParams.get('class');
  const roomParam = searchParams.get('room');
  const selectedClass = classes.find(c => c.id === classParam);
  const selectedRoom = selectedClass?.rooms.find(r => r.id === roomParam);
  const { profile, roleLabel, isClassAdmin } = useUserProfile(classParam || undefined);
  
  // Check if we're in a chat room for footer visibility
  const isInChatRoom = !!roomParam;

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-base-300 flex flex-col">
      {/* Edgy Berlin Header */}
      <header className="bg-base-100 border-b-2 border-base-content/10">
        <div className="w-full px-4 lg:px-0 lg:grid lg:grid-cols-[256px_1fr]">
          <div className="flex items-center justify-between py-4 lg:justify-end lg:pl-12">
            {/* Logo/Brand with accent bar - right aligned on desktop */}
            <div className="flex flex-col lg:items-end">
              <h1 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-base-content">
                KlasseChatten
              </h1>
              <div className="h-0.5 w-16 lg:w-20 bg-primary mt-1 lg:ml-auto"></div>
              {/* Class and Channel selectors on mobile - below logo */}
              {selectedClass && (
                <div className="mt-2 lg:hidden flex gap-2">
                  {/* Class selector */}
                  {classes.length > 1 ? (
                    <select
                      value={selectedClass.id}
                      onChange={(e) => {
                        const newClassId = e.target.value;
                        router.push(`?class=${newClassId}`);
                      }}
                      className="select select-xs bg-base-100 border border-base-content/20 text-xs font-mono uppercase tracking-wider text-base-content/80"
                    >
                      {classes.map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-mono uppercase tracking-wider text-base-content/60">
                      {selectedClass.label}
                    </span>
                  )}
                  
                  {/* Channel selector - Only show when in a chat room */}
                  {selectedRoom && selectedClass.rooms.length > 1 && (
                    <>
                      <span className="text-xs text-base-content/40">•</span>
                      <div className="dropdown">
                        <div tabIndex={0} role="button" className="flex items-center gap-1 cursor-pointer bg-transparent text-xs font-mono uppercase tracking-wider text-base-content/80">
                          <span># {selectedRoom.name}</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="square" strokeLinejoin="miter" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        <ul tabIndex={-1} className="dropdown-content menu bg-base-100 rounded-none border border-base-content/20 z-1 w-48 p-2 shadow-lg mt-1">
                          {selectedClass.rooms.map((room) => (
                            <li key={room.id}>
                              <button
                                onClick={() => {
                                  if (!room.is_locked) {
                                    router.push(`?class=${selectedClass.id}&room=${room.id}`);
                                  }
                                }}
                                disabled={room.is_locked}
                                className={`text-xs justify-between ${room.id === selectedRoom.id ? 'bg-primary text-primary-content' : ''}`}
                              >
                                <span># {room.name}</span>
                                {room.id === selectedRoom.id && <span className="ml-1">✓</span>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu button - shows user controls */}
            <div className="lg:hidden">
              <button
                onClick={handleSignOut}
                className="btn btn-sm bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
              >
                Log Ud
              </button>
            </div>
          </div>
          
          {/* User Controls for large screens - in second grid column */}
          <div className="hidden lg:flex items-center justify-end gap-6 py-4 px-12">
            {/* Class Selector/Display */}
            {selectedClass && (
              <>
                {classes.length > 1 ? (
                  <div className="flex flex-col items-end">
                    <label htmlFor="class-selector" className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-1">
                      Klasse
                    </label>
                    <select
                      id="class-selector"
                      value={selectedClass.id}
                      onChange={(e) => {
                        const newClassId = e.target.value;
                        router.push(`?class=${newClassId}`);
                      }}
                      className="select select-sm bg-base-100 border-2 border-base-content/10 hover:border-primary/50 focus:border-primary text-sm font-medium min-w-[180px]"
                    >
                      {classes.map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">
                      Klasse
                    </span>
                    <span className="text-sm font-medium text-base-content">
                      {selectedClass.label}
                    </span>
                  </div>
                )}
                <div className="w-px h-8 bg-base-content/10"></div>
              </>
            )}
            
            {/* Channel Selector - Only show when in a chat room */}
            {selectedRoom && selectedClass && selectedClass.rooms.length > 1 && (
              <>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">
                    Kanal
                  </span>
                  <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="flex items-center gap-2 cursor-pointer bg-transparent text-sm font-medium text-base-content">
                      <span># {selectedRoom.name}</span>
                      <svg className="w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="square" strokeLinejoin="miter" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <ul tabIndex={-1} className="dropdown-content menu bg-base-100 rounded-none border-2 border-base-content/10 z-1 w-52 p-2 shadow-lg mt-2">
                      {selectedClass.rooms.map((room) => (
                        <li key={room.id}>
                          <button
                            onClick={() => {
                              if (!room.is_locked) {
                                router.push(`?class=${selectedClass.id}&room=${room.id}`);
                              }
                            }}
                            disabled={room.is_locked}
                            className={`text-left justify-between ${room.id === selectedRoom.id ? 'bg-primary text-primary-content' : ''}`}
                          >
                            <span># {room.name}</span>
                            {room.id === selectedRoom.id && <span className="ml-2">✓</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="w-px h-8 bg-base-content/10"></div>
              </>
            )}
            
            {/* User Info */}
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">
                {roleLabel}{isClassAdmin && ' ⊕'}
              </span>
              <span className="text-sm font-medium text-base-content">
                {profile?.display_name || user?.user_metadata?.display_name || user?.email}
              </span>
            </div>
            
            {/* Logout Button */}
            <button
              onClick={handleSignOut}
              className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
            >
              Log Ud
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 bg-base-300">
        <div className="w-full max-w-7xl mx-auto px-12">
          <Suspense fallback={
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                <span className="loading loading-ball loading-lg text-primary"></span>
                <p className="text-base-content/60 font-medium">Indlæser...</p>
              </div>
            </div>
          }>
            {profile?.role === 'admin' ? <AdminDashboard /> : <ClassRoomBrowser />}
          </Suspense>
        </div>
      </main>

      {/* Footer with geometric pattern - hidden on small screens when in chat room */}
      <footer className={`bg-base-100 border-t-2 border-base-content/10 relative z-50 ${isInChatRoom ? 'hidden lg:block' : ''}`}>
        <div className="w-full px-12 py-4 lg:grid lg:grid-cols-[256px_1fr] lg:px-0">
          <div className="flex justify-between items-center lg:flex-col lg:items-end">
            <div className="text-xs font-mono text-base-content/40 uppercase tracking-wider">
              © 2025 KlasseChatten
            </div>
            <div className="flex gap-4 items-center lg:hidden">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-primary"></div>
                <div className="w-2 h-2 bg-secondary"></div>
                <div className="w-2 h-2 bg-accent"></div>
              </div>
              
              {/* Theme Controller - Mobile */}
              <ThemeController />
            </div>
          </div>
          
          {/* Geometric pattern and theme switcher for large screens - in second grid column */}
          <div className="hidden lg:flex gap-6 items-center justify-between px-12">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-primary"></div>
              <div className="w-2 h-2 bg-secondary"></div>
              <div className="w-2 h-2 bg-accent"></div>
            </div>
            
            {/* Theme Controller */}
            <ThemeController />
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  );
}
