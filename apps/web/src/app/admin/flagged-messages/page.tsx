'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserClasses } from '@/hooks/useUserClasses';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Flag } from 'lucide-react';

interface ModerationEventWithContext {
  event_id: string;
  message_id: number;
  class_id: string;
  rule: string;
  score: number;
  labels: string[];
  severity: 'high_severity' | 'moderate_severity';
  created_at: string;
  message: {
    id: number;
    body: string;
    user_id: string;
    created_at: string;
    author?: {
      user_id: string;
      display_name: string;
      avatar_url?: string;
      avatar_color?: string;
    };
  };
  context: {
    before: Array<{
      id: number;
      body: string;
      user_id: string;
      created_at: string;
      author?: {
        user_id: string;
        display_name: string;
        avatar_url?: string;
        avatar_color?: string;
      };
    }>;
    after: Array<{
      id: number;
      body: string;
      user_id: string;
      created_at: string;
      author?: {
        user_id: string;
        display_name: string;
        avatar_url?: string;
        avatar_color?: string;
      };
    }>;
  };
}

export default function FlaggedMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get('class_id');
  const { user } = useAuth();
  const { profile, isClassAdmin, loading: profileLoading } = useUserProfile(classId || '');
  const { classes, loading: classesLoading } = useUserClasses();
  const hasAnyClassAdmin = classes?.some?.((c) => c.is_class_admin);

  const [flaggedMessages, setFlaggedMessages] = useState<ModerationEventWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'all' | 'high_severity' | 'moderate_severity'>('all');

  // Permission check: must be admin or class admin for the class
  const isAdmin = profile?.role === 'admin';
  const isTeacher = profile?.role === 'adult';
  const canAccess = isAdmin || (isClassAdmin && !!classId) || (isTeacher && !!classId);

  useEffect(() => {
    // Wait until profile loading finishes before deciding access
    if (profileLoading) return;

    if (!user) return; // Auth context will handle redirect elsewhere

    if (!canAccess) {
      // If teacher or class admin without classId, render a class picker instead of redirecting
      if ((isTeacher || isClassAdmin) && !classId) {
        setLoading(false);
        return;
      }
      // If user is class admin in any class, let them pick a class
      if (hasAnyClassAdmin) {
        setLoading(false);
        return;
      }
      // Otherwise, not authorized – show inline message instead of redirecting
      setError('Du har ikke adgang til at se flaggede beskeder. Kontakt en administrator.');
      setLoading(false);
      return;
    }

    const fetchFlaggedMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (!session) {
          throw new Error('Unauthorized');
        }

        const params = new URLSearchParams();
        
        if (severity !== 'all') {
          params.append('severity', severity);
        }
        
        if (isClassAdmin && classId) {
          params.append('class_id', classId);
        }

        const response = await fetch(
          `/api/moderation/flagged-messages?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch flagged messages');
        }

        const data = await response.json();
        setFlaggedMessages(data.flagged_messages || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchFlaggedMessages();
  }, [canAccess, classId, isClassAdmin, severity, user, profileLoading]);

  if (loading) {
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

  if (error) {
    return (
      <AdminLayout>
        <div className="w-full max-w-7xl mx-auto px-12 py-8">
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
            <svg className="w-16 h-16 stroke-current text-error mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v6m0 4v0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
              Adgang nægtet
            </h2>
            <p className="text-base-content/60">{error}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Teacher or class admin without class selected: show class picker
  if ((isTeacher || isClassAdmin) && !classId) {
    return (
      <AdminLayout>
        <div className="w-full max-w-7xl mx-auto px-12 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black uppercase tracking-tight text-base-content">Vælg klasse</h1>
            <div className="h-1 w-24 bg-primary mt-2"></div>
            <p className="text-sm text-base-content/60 mt-3">Vælg en klasse for at se flaggede beskeder.</p>
          </div>
          {classesLoading ? (
            <div className="flex justify-center items-center min-h-[30vh]">
              <span className="loading loading-ball loading-lg text-primary"></span>
            </div>
          ) : (
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
          )}
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

        {/* Filters */}
        <div className="mb-8">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="join">
              <input
                className="join-item btn btn-sm"
                type="radio"
                name="severity"
                aria-label="Alle"
                checked={severity === 'all'}
                onChange={() => setSeverity('all')}
              />
              <input
                className="join-item btn btn-sm"
                type="radio"
                name="severity"
                aria-label="Høj"
                checked={severity === 'high_severity'}
                onChange={() => setSeverity('high_severity')}
              />
              <input
                className="join-item btn btn-sm"
                type="radio"
                name="severity"
                aria-label="Moderat"
                checked={severity === 'moderate_severity'}
                onChange={() => setSeverity('moderate_severity')}
              />
            </div>
            
            <div className="text-sm text-base-content/60">
              {flaggedMessages.length} besked{flaggedMessages.length !== 1 ? 'er' : ''}
            </div>
            {/* Hint about legacy flags visibility */}
            {severity === 'high_severity' && (
              <div className="text-xs text-base-content/50">
                Tip: Filtrering på "Høj" viser kun AI-mærkede sager. Ældre flag (kun is_flagged) vises under "Alle" eller "Moderat".
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {flaggedMessages.length === 0 ? (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
            <svg
              className="w-16 h-16 stroke-current text-success mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
              Ingen flaggede beskeder
            </h2>
            <p className="text-base-content/60">
              Alle beskeder er godkendt af AI-moderation
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {flaggedMessages.map((msg) => (
              <div key={msg.event_id} className="bg-base-100 border-2 border-base-content/10 shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    {/* Severity badge */}
                    <div
                      className={`badge font-bold uppercase shrink-0 ${
                        msg.severity === 'high_severity' ? 'badge-error badge-lg' : 'badge-warning badge-md'
                      }`}
                    >
                      {msg.severity === 'high_severity' ? 'Høj' : 'Moderat'}
                    </div>

                    {/* Message info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold uppercase tracking-widest text-base-content/60">
                          {msg.message?.author?.display_name || 'Ukendt bruger'}
                        </span>
                        <span className="text-xs text-base-content/40">•</span>
                        <span className="text-xs text-base-content/40">
                          {new Date(msg.message?.created_at || '').toLocaleString('da-DK')}
                        </span>
                      </div>
                      <div className="badge badge-sm badge-ghost mb-3">
                        {msg.rule.replace(/_/g, ' ')}
                      </div>
                      <p className="text-base text-base-content wrap-break-word">
                        {msg.message?.body || '(Ingen besked)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action footer */}
                <div className="px-6 py-3 bg-base-200/30 border-t-2 border-base-content/10 flex justify-end gap-2">
                  <button className="btn btn-sm btn-ghost">
                    Godkend
                  </button>
                  <button className="btn btn-sm btn-ghost text-error">
                    Slet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
