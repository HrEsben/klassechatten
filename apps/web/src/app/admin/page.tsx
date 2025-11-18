"use client";
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserClasses } from '@/hooks/useUserClasses';

export default function AdminHomePage() {
  const { profile } = useUserProfile();
  const { classes } = useUserClasses();
  
  const isGlobalAdmin = profile?.role === 'admin';
  const adminClasses = classes.filter(c => c.is_class_admin);

  return (
    <AdminLayout>
      <div className="w-full max-w-7xl mx-auto px-12 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content">
            {isGlobalAdmin ? 'System Oversigt' : 'Mine Klasser'}
          </h1>
          <div className="h-1 w-24 bg-primary mt-2"></div>
          <p className="text-sm text-base-content/60 mt-3">
            {isGlobalAdmin 
              ? 'Hurtige genveje til system administration og moderation.'
              : 'Administrer dine klasser og se flaggede beskeder.'}
          </p>
        </div>

        {/* Global Admin View */}
        {isGlobalAdmin && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/flagged-messages"
              className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
            >
              <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
              <div className="px-8 py-6 pl-10">
                <div className="flex items-start justify-between mb-3">
                  <svg className="w-8 h-8 stroke-current text-primary" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M3 21l1.65-3.8a9 9 0 1111.15 0L18 21M12 12v-2M12 6h.01" />
                  </svg>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                  Alle Flaggede Beskeder
                </h3>
                <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                  Se og håndter AI-flagning og lærermarkeringer fra hele systemet
                </p>
              </div>
            </Link>

            <Link
              href="/admin/classes"
              className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
            >
              <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
              <div className="px-8 py-6 pl-10">
                <div className="flex items-start justify-between mb-3">
                  <svg className="w-8 h-8 stroke-current text-secondary" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M3 5h18M3 10h18M3 15h18M3 20h18" />
                  </svg>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                  Alle Klasser
                </h3>
                <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                  Gennemse og administrer alle klasser i systemet
                </p>
              </div>
            </Link>

            <Link
              href="/admin/users"
              className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
            >
              <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
              <div className="px-8 py-6 pl-10">
                <div className="flex items-start justify-between mb-3">
                  <svg className="w-8 h-8 stroke-current text-accent" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                  Alle Brugere
                </h3>
                <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                  Find og administrer alle brugere i systemet
                </p>
              </div>
            </Link>

            <Link
              href="/admin/settings"
              className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
            >
              <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
              <div className="px-8 py-6 pl-10">
                <div className="flex items-start justify-between mb-3">
                  <svg className="w-8 h-8 stroke-current text-info" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                  Systemindstillinger
                </h3>
                <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                  Konfigurer globale indstillinger og funktioner
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Class Admin View */}
        {!isGlobalAdmin && adminClasses.length > 0 && (
          <div className="space-y-8">
            {adminClasses.map((cls) => (
              <div key={cls.id} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
                    {cls.nickname || cls.label}
                  </h2>
                  <p className="text-xs font-mono uppercase tracking-wider text-base-content/50 mt-1">
                    {cls.school_name} • {cls.grade_level}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Link
                    href={`/?class=${cls.id}`}
                    className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
                    <div className="px-8 py-6 pl-10">
                      <div className="flex items-start justify-between mb-3">
                        <svg className="w-8 h-8 stroke-current text-primary" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="square" strokeLinejoin="miter" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                        Klassekanaler
                      </h3>
                      <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                        Se og deltag i klassens chat-kanaler
                      </p>
                    </div>
                  </Link>

                  <Link
                    href={`/class/${cls.id}/flagged`}
                    className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
                    <div className="px-8 py-6 pl-10">
                      <div className="flex items-start justify-between mb-3">
                        <svg className="w-8 h-8 stroke-current text-warning" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="square" strokeLinejoin="miter" d="M3 21l1.65-3.8a9 9 0 1111.15 0L18 21M12 12v-2M12 6h.01" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                        Flaggede Beskeder
                      </h3>
                      <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                        Se og håndter AI-flagning for denne klasse
                      </p>
                    </div>
                  </Link>

                  <Link
                    href={`/class/${cls.id}/settings`}
                    className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
                    <div className="px-8 py-6 pl-10">
                      <div className="flex items-start justify-between mb-3">
                        <svg className="w-8 h-8 stroke-current text-secondary" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="square" strokeLinejoin="miter" d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                        Indstillinger
                      </h3>
                      <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                        Moderationsniveau og klasse-specifikke indstillinger
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Admin Classes */}
        {!isGlobalAdmin && adminClasses.length === 0 && (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
            <svg className="w-16 h-16 stroke-current text-secondary mx-auto" strokeWidth={2} fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" d="M3 5h18M3 10h18M3 15h18M3 20h18" />
            </svg>
            <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
              Ingen klasser fundet
            </h2>
            <p className="text-base-content/60">
              Du er ikke klasseadministrator for nogen klasser endnu.
            </p>
            <Link href="/" className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content">
              Gå til Mine Beskeder
            </Link>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
