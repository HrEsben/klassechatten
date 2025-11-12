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
    <div className="min-h-screen bg-base-100">
      {/* Header with user controls */}
      <div className="navbar bg-base-200 shadow-sm">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">KlasseChat</a>
        </div>
        <div className="flex-none gap-2">
          <div className="text-base-content/70">
            {user?.user_metadata?.display_name || user?.email}
          </div>
          <button
            onClick={handleSignOut}
            className="btn btn-error btn-sm"
          >
            Log ud
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="page-container">
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-6">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <div className="text-base-content/60">Loading classes...</div>
            </div>
          </div>
        }>
          <ClassRoomBrowser />
        </Suspense>
      </div>
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
