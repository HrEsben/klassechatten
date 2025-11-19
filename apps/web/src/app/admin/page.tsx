"use client";
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserClasses } from '@/hooks/useUserClasses';
import { Flag, LayoutList, Users, Settings, MessageSquare, UserCheck, BookOpen } from 'lucide-react';

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
                  <Flag className="w-8 h-8 stroke-current text-primary" strokeWidth={2} />
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
                  <LayoutList className="w-8 h-8 stroke-current text-secondary" strokeWidth={2} />
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
                  <Users className="w-8 h-8 stroke-current text-accent" strokeWidth={2} />
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
                  <Settings className="w-8 h-8 stroke-current text-info" strokeWidth={2} />
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
                        <MessageSquare className="w-8 h-8 stroke-current text-primary" strokeWidth={2} />
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
                        <Flag className="w-8 h-8 stroke-current text-warning" strokeWidth={2} />
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
                        <Settings className="w-8 h-8 stroke-current text-secondary" strokeWidth={2} />
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
            <LayoutList className="w-16 h-16 stroke-current text-secondary mx-auto" strokeWidth={2} />
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
