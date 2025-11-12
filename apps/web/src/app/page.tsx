'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ClassRoomBrowser from '@/components/ClassRoomBrowser';

function HomePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-base-300 flex flex-col">
      {/* Edgy Berlin Header */}
      <header className="bg-base-100 border-b-2 border-base-content/10">
        <div className="w-full max-w-7xl mx-auto px-12">
          <div className="flex items-center justify-between py-4">
            {/* Logo/Brand with accent bar */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h1 className="text-2xl font-black uppercase tracking-tight text-base-content">
                  KlasseChat
                </h1>
                <div className="h-0.5 w-20 bg-primary mt-1"></div>
              </div>
            </div>

            {/* User Controls */}
            <div className="flex items-center gap-6">
              {/* User Info */}
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">
                  Bruger
                </span>
                <span className="text-sm font-medium text-base-content">
                  {user?.user_metadata?.display_name || user?.email}
                </span>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleSignOut}
                className="btn btn-sm h-10 px-8 bg-base-content text-base-100 hover:bg-primary hover:text-primary-content font-bold uppercase tracking-wider text-xs transition-all shadow-sm hover:shadow-md"
              >
                Log Ud
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 bg-base-300">
        <div className="w-full max-w-7xl mx-auto px-12">
          <Suspense fallback={
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-8">
                {/* Custom Loading Animation */}
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-base-content/10 border-t-primary animate-spin"></div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-base-content/40">
                    Indlæser
                  </span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-primary animate-pulse delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-primary animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            </div>
          }>
            <ClassRoomBrowser />
          </Suspense>
        </div>
      </main>

      {/* Footer with geometric pattern */}
      <footer className="bg-base-100 border-t-2 border-base-content/10">
        <div className="w-full max-w-7xl mx-auto px-12 py-4">
          <div className="flex justify-between items-center">
            <div className="text-xs font-mono text-base-content/40 uppercase tracking-wider">
              © 2025 KlasseChat
            </div>
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-primary"></div>
              <div className="w-2 h-2 bg-secondary"></div>
              <div className="w-2 h-2 bg-accent"></div>
            </div>
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
