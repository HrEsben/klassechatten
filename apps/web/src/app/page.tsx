'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
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
    <div className="min-h-screen flex flex-col bg-base-200">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-lg px-4">
        <div className="navbar-start">
          <h1 className="text-xl font-bold text-primary">KlasseChatten</h1>
        </div>
        <div className="navbar-end">
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
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4">
        <ClassRoomBrowser />
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
