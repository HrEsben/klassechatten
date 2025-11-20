'use client';

import { use } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import FlaggedMessagesList from '@/components/FlaggedMessagesList';
import { Flag, AlertCircle } from 'lucide-react';

export default function ClassFlaggedMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = use(params);
  const { user } = useAuth();
  const { profile, isClassAdmin, loading: profileLoading } = useUserProfile(classId);

  // Show loading
  if (profileLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-12 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-ball loading-lg text-primary"></span>
            <p className="text-base-content/60 font-medium">Indlæser flaggede beskeder...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check access
  if (!user) {
    return null; // Auth context will redirect
  }

  // Must be class admin or admin for this class
  const isAdmin = profile?.role === 'admin';
  const canAccess = isAdmin || isClassAdmin;

  if (!canAccess) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-12 py-8">
        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
          <AlertCircle className="w-16 h-16 stroke-current text-error mx-auto" strokeWidth={2} />
          <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
            Adgang nægtet
          </h2>
          <p className="text-base-content/60">Du har ikke adgang til at se flaggede beskeder for denne klasse.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-12 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Flag size={32} strokeWidth={2} className="stroke-current text-warning" />
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content">
            Flaggede Beskeder
          </h1>
        </div>
        <div className="h-1 w-24 bg-primary mt-2"></div>
      </div>

      {/* Shared component */}
      <FlaggedMessagesList 
        classId={classId} 
        isAdmin={isAdmin}
        showDismissedCount={isAdmin}
      />
    </div>
  );
}
