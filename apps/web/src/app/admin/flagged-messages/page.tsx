'use client';

import { useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserClasses } from '@/hooks/useUserClasses';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import FlaggedMessagesList from '@/components/FlaggedMessagesList';
import { Flag, AlertCircle } from 'lucide-react';

export default function FlaggedMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get('class_id');
  const { user } = useAuth();
  const { profile, isClassAdmin, loading: profileLoading } = useUserProfile(classId || '');
  const { classes, loading: classesLoading } = useUserClasses();
  const hasAnyClassAdmin = classes?.some?.((c) => c.is_class_admin);

  // Permission check
  const isAdmin = profile?.role === 'admin';
  const isTeacher = profile?.role === 'adult';
  const canAccess = isAdmin || (isClassAdmin && !!classId) || (isTeacher && !!classId);

  // Show loading
  if (profileLoading || classesLoading) {
    return (
      <AdminLayout>
        <div className="w-full max-w-7xl mx-auto px-12 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <span className="loading loading-ball loading-lg text-primary"></span>
              <p className="text-base-content/60 font-medium">Indlæser flaggede beskeder...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Check access
  if (!user) {
    return null; // Auth context will redirect
  }

  if (!canAccess) {
    // Teacher or class admin without classId: show class picker
    if ((isTeacher || isClassAdmin) && !classId) {
      return (
        <AdminLayout>
          <div className="w-full max-w-7xl mx-auto px-12 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-black uppercase tracking-tight text-base-content">Vælg klasse</h1>
              <div className="h-1 w-24 bg-primary mt-2"></div>
              <p className="text-sm text-base-content/60 mt-3">Vælg en klasse for at se flaggede beskeder.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/admin/flagged-messages?class_id=${c.id}`)}
                  className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
                >
                  <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
                  <div className="px-8 py-6 pl-10">
                    <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">{c.nickname || c.label}</h3>
                    <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">{c.school_name || 'Klasse'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </AdminLayout>
      );
    }

    // User has class admin in any class, let them pick
    if (hasAnyClassAdmin) {
      return (
        <AdminLayout>
          <div className="w-full max-w-7xl mx-auto px-12 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-black uppercase tracking-tight text-base-content">Vælg klasse</h1>
              <div className="h-1 w-24 bg-primary mt-2"></div>
              <p className="text-sm text-base-content/60 mt-3">Vælg en klasse for at se flaggede beskeder.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/admin/flagged-messages?class_id=${c.id}`)}
                  className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
                >
                  <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
                  <div className="px-8 py-6 pl-10">
                    <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">{c.nickname || c.label}</h3>
                    <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">{c.school_name || 'Klasse'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </AdminLayout>
      );
    }

    // No access
    return (
      <AdminLayout>
        <div className="w-full max-w-7xl mx-auto px-12 py-8">
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
            <AlertCircle className="w-16 h-16 stroke-current text-error mx-auto" strokeWidth={2} />
            <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
              Adgang nægtet
            </h2>
            <p className="text-base-content/60">Du har ikke adgang til at se flaggede beskeder. Kontakt en administrator.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="w-full max-w-7xl mx-auto px-12 py-8">
        {/* Header */}
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
          classId={classId || undefined} 
          isAdmin={isAdmin}
          showDismissedCount={isAdmin}
        />
      </div>
    </AdminLayout>
  );
}
