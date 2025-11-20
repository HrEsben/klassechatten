'use client';

import { use, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import UserMenu from '@/components/UserMenu';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ClassAdminLayoutProps {
  children: ReactNode;
  classId: string;
}

export default function ClassAdminLayout({ children, classId }: ClassAdminLayoutProps) {
  const { user } = useAuth();
  const { profile } = useUserProfile(classId);

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* Header with back button and user menu */}
      <header className="flex-none bg-base-100 border-b-2 border-base-content/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-12 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/" 
              className="btn btn-ghost btn-sm"
            >
              <ArrowLeft size={20} strokeWidth={2} />
              <span className="hidden sm:inline">Tilbage</span>
            </Link>
            
            <UserMenu 
              userName={profile?.display_name || user?.email}
              userRole={profile?.role || 'user'}
              avatarUrl={profile?.avatar_url}
            />
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
