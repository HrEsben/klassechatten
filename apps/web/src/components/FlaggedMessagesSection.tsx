'use client';

import { useEffect, useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface FlaggedMessage {
  id: string;
  severity: 'high_severity' | 'low_severity';
  rule: string;
  messages: {
    body: string;
    user_id: string;
    created_at: string;
    profiles?: {
      display_name: string;
      avatar_url?: string;
    };
  };
}

export default function FlaggedMessagesSection({ classId }: { classId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, isClassAdmin } = useUserProfile(classId);
  const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highSeverityCount, setHighSeverityCount] = useState(0);

  // Only show section if user is admin or class admin
  const canSeeFlagged = profile?.role === 'admin' || isClassAdmin;

  useEffect(() => {
    if (!canSeeFlagged || !user) return;

    const fetchFlaggedMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (!session) {
          throw new Error('Unauthorized');
        }

        const params = new URLSearchParams({
          severity: 'high_severity',
          ...(isClassAdmin && classId && { class_id: classId }),
        });

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
        const messages = data.flagged_messages || [];
        setFlaggedMessages(messages.slice(0, 5)); // Show only top 5
        setHighSeverityCount(messages.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchFlaggedMessages();
  }, [canSeeFlagged, classId, isClassAdmin, user]);

  if (!canSeeFlagged) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4">
          <span className="loading loading-ball loading-sm text-primary"></span>
          <span className="text-sm text-base-content/60">Indlæser flaggede beskeder...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-base-100 border-2 border-error/30 shadow-lg p-6 mb-8">
        <p className="text-sm text-error">Fejl ved indlæsning af flaggede beskeder: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-base-100 border-2 border-base-content/10 shadow-lg mb-8 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b-2 border-base-content/10 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight text-base-content flex items-center gap-3">
            Flaggede Beskeder
            {highSeverityCount > 0 && (
              <span className="badge badge-error badge-lg font-bold">
                {highSeverityCount}
              </span>
            )}
          </h3>
          <p className="text-xs font-mono uppercase tracking-wider text-base-content/50 mt-1">
            AI-modererede beskeder der kræver opmærksomhed
          </p>
        </div>
        <button
          onClick={() => {
            const params = new URLSearchParams({
              ...(isClassAdmin && classId && { class_id: classId }),
            });
            router.push(`/admin/moderation?${params.toString()}`);
          }}
          className="btn btn-sm btn-primary font-bold uppercase"
        >
          Se Alt
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {highSeverityCount === 0 ? (
        <div className="p-12 text-center space-y-4">
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
          <h3 className="text-lg font-black uppercase tracking-tight text-base-content">
            Ingen flaggede beskeder
          </h3>
          <p className="text-base-content/60">
            Alle beskeder er godkendt af AI-moderation
          </p>
        </div>
      ) : (
        <div className="divide-y-2 divide-base-content/10">
          {flaggedMessages.map((msg) => (
            <div key={msg.id} className="p-6 hover:bg-base-200/50 transition-colors duration-200">
              <div className="flex items-start gap-4">
                {/* Severity badge */}
                <div
                  className={`badge badge-lg font-bold uppercase shrink-0 ${
                    msg.severity === 'high_severity' ? 'badge-error' : 'badge-warning'
                  }`}
                >
                  {msg.severity === 'high_severity' ? 'Høj' : 'Lav'}
                </div>

                {/* Message info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-base-content/60">
                      {msg.messages?.profiles?.display_name || 'Ukendt bruger'}
                    </span>
                    <span className="text-xs text-base-content/40">•</span>
                    <span className="text-xs text-base-content/40">
                      {msg.rule.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-base-content wrap-break-word">
                    {msg.messages?.body || '(Ingen besked)'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
