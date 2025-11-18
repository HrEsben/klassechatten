'use client';

import { useEffect, useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function FlaggedMessagesSection({ classId }: { classId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, isClassAdmin } = useUserProfile(classId);
  const [highSeverityCount, setHighSeverityCount] = useState(0);

  // Only show section if user is admin or class admin
  const canSeeFlagged = profile?.role === 'admin' || isClassAdmin;

  useEffect(() => {
    if (!canSeeFlagged || !user) return;

    const fetchFlaggedMessages = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (!session) {
          return;
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
          return;
        }

        const data = await response.json();
        const messages = data.flagged_messages || [];
        setHighSeverityCount(messages.length);
      } catch (err) {
        // Silent fail
      }
    };

    fetchFlaggedMessages();
  }, [canSeeFlagged, classId, isClassAdmin, user]);

  if (!canSeeFlagged) {
    return null;
  }

  return (
    <button
      onClick={() => {
        const params = new URLSearchParams({
          ...(isClassAdmin && classId && { class_id: classId }),
        });
        router.push(`/admin/flagged-messages?${params.toString()}`);
      }}
      className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-warning/50 transition-all duration-200 overflow-hidden w-full"
    >
      {/* Vertical accent bar */}
      <div className="absolute left-0 top-0 w-1 h-full bg-warning/30 group-hover:bg-warning group-hover:w-2 transition-all duration-200"></div>

      <div className="px-8 py-6 pl-10">
        {/* Icon and count */}
        <div className="flex items-start justify-between mb-3">
          <svg className="w-8 h-8 text-warning" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3h2v18H3V3zm4 0h12v2H7V3zm0 4h12v2H7V7zm0 4h12v2H7v-2zm0 4h12v2H7v-2z" />
          </svg>
          {highSeverityCount > 0 && (
            <span className="badge badge-error badge-lg font-bold">
              {highSeverityCount}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
          Flaggede Beskeder
        </h3>

        {/* Description */}
        <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
          {highSeverityCount > 0 
            ? 'AI-modererede beskeder der kræver opmærksomhed'
            : 'Se alle modererede beskeder'
          }
        </p>
      </div>
    </button>
  );
}
