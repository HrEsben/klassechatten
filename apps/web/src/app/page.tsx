'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ClassRoomBrowser from '@/components/ClassRoomBrowser';
import AppLayout from '@/components/AppLayout';
import { useUserProfile } from '@/hooks/useUserProfile';

function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classParam = searchParams.get('class');
  const roomParam = searchParams.get('room');
  const { profile } = useUserProfile(classParam || undefined);
  
  // Redirect global admins to /admin
  if (profile?.role === 'admin') {
    router.push('/admin');
    return null;
  }
  
  // Check if we're in a chat room for conditional layout
  const isInChatRoom = !!roomParam;

  return (
    <AppLayout>
      {isInChatRoom ? (
        <div className="h-full w-full">
          <Suspense fallback={
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                <span className="loading loading-ball loading-lg text-primary"></span>
                <p className="text-base-content/60 font-medium">Indlæser...</p>
              </div>
            </div>
          }>
            <ClassRoomBrowser />
          </Suspense>
        </div>
      ) : (
        <div className="h-full overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto px-12 py-8">
            <Suspense fallback={
              <div className="flex justify-center items-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                  <span className="loading loading-ball loading-lg text-primary"></span>
                  <p className="text-base-content/60 font-medium">Indlæser...</p>
                </div>
              </div>
            }>
              <ClassRoomBrowser />
            </Suspense>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  );
}
