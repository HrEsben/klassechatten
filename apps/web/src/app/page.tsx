'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ClassRoomBrowser from '@/components/ClassRoomBrowser';
import CachedWrapper from '@/components/CachedWrapper';

function HomePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <CachedWrapper>
      {/* Dynamic user controls in header */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-4">
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

      {/* Main content with loading fallback */}
      <div className="p-4">
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-screen bg-base-100/80">
            <div className="flex flex-col items-center gap-6">
              <div className="loading loading-spinner loading-lg text-primary"></div>
              <div className="text-base-content/60 font-light tracking-wide">Loading classes...</div>
            </div>
          </div>
        }>
          {/* Use the original ClassRoomBrowser for real-time functionality */}
          <ClassRoomBrowser />
        </Suspense>
      </div>
    </CachedWrapper>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  );
}
