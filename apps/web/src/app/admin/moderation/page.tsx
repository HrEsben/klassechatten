'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';

interface Author {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  avatar_color?: string;
}

interface ContextMessage {
  id: number;
  body: string;
  user_id: string;
  created_at: string;
  author: Author;
}

interface FlaggedMessage {
  event_id: string;
  message_id: number;
  class_id: string;
  rule: string;
  score: number;
  labels: string[];
  severity: string;
  created_at: string;
  message: {
    id: number;
    body: string;
    user_id: string;
    created_at: string;
    author: Author;
  };
  context: {
    before: ContextMessage[];
    after: ContextMessage[];
  };
}

function AdminModerationContent() {
  const router = useRouter();
  const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);

  useEffect(() => {
    fetchFlaggedMessages();
    
    // Subscribe to real-time updates for new flagged messages
    const channel = supabase
      .channel('moderation_events_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moderation_events',
          filter: 'status=eq.flagged',
        },
        () => {
          // Refetch when new flagged message is inserted
          fetchFlaggedMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [severityFilter]);

  async function fetchFlaggedMessages() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const params = new URLSearchParams();
      if (severityFilter !== 'all') {
        params.append('severity', severityFilter);
      }

      const response = await fetch(`/api/moderation/flagged-messages?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch flagged messages');
      }

      const data = await response.json();
      setFlaggedMessages(data.flagged_messages || []);
    } catch (error) {
      console.error('Error fetching flagged messages:', error);
    } finally {
      setLoading(false);
    }
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'high_severity':
        return 'badge-error';
      case 'moderate_severity':
        return 'badge-warning';
      case 'low_severity':
        return 'badge-info';
      default:
        return 'badge-neutral';
    }
  }

  function getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'high_severity':
        return 'Høj';
      case 'moderate_severity':
        return 'Moderat';
      case 'low_severity':
        return 'Lav';
      default:
        return severity;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('da-DK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function toggleExpanded(messageId: number) {
    setExpandedMessageId(expandedMessageId === messageId ? null : messageId);
  }

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost btn-square"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-6 h-6 stroke-current" strokeWidth={2}>
            <path strokeLinecap="square" strokeLinejoin="miter" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content">
            Flaggede Beskeder
          </h1>
          <div className="h-1 w-24 bg-primary mt-2"></div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">
            Filtrer efter alvorlighed:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSeverityFilter('all')}
              className={`btn btn-sm font-bold uppercase transition-all duration-200 ${
                severityFilter === 'all'
                  ? 'btn-primary'
                  : 'btn-ghost border-2 border-base-content/10 hover:border-primary/50'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setSeverityFilter('high_severity')}
              className={`btn btn-sm font-bold uppercase transition-all duration-200 ${
                severityFilter === 'high_severity'
                  ? 'btn-error'
                  : 'btn-ghost border-2 border-base-content/10 hover:border-error/50'
              }`}
            >
              Høj
            </button>
            <button
              onClick={() => setSeverityFilter('moderate_severity')}
              className={`btn btn-sm font-bold uppercase transition-all duration-200 ${
                severityFilter === 'moderate_severity'
                  ? 'btn-warning'
                  : 'btn-ghost border-2 border-base-content/10 hover:border-warning/50'
              }`}
            >
              Moderat
            </button>
            <button
              onClick={() => setSeverityFilter('low_severity')}
              className={`btn btn-sm font-bold uppercase transition-all duration-200 ${
                severityFilter === 'low_severity'
                  ? 'btn-info'
                  : 'btn-ghost border-2 border-base-content/10 hover:border-info/50'
              }`}
            >
              Lav
            </button>
          </div>
        </div>
      </div>

      {/* Messages List */}
      {loading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-ball loading-lg text-primary"></span>
            <p className="text-base-content/60 font-medium">Indlæser flaggede beskeder...</p>
          </div>
        </div>
      ) : flaggedMessages.length === 0 ? (
        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-16 h-16 stroke-current text-success mx-auto" strokeWidth={2}>
            <path strokeLinecap="square" strokeLinejoin="miter" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
            Ingen flaggede beskeder
          </h2>
          <p className="text-base-content/60">
            {severityFilter !== 'all' 
              ? `Ingen beskeder med alvorlighed "${getSeverityLabel(severityFilter)}" fundet`
              : 'Alle beskeder er godkendt af AI-moderation'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {flaggedMessages.map((item) => (
            <div
              key={item.event_id}
              className="bg-base-100 border-2 border-base-content/10 shadow-lg overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b-2 border-base-content/10 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="avatar placeholder">
                      <div
                        className="w-10 h-10 text-base-100 text-sm font-bold"
                        style={{ backgroundColor: item.message.author.avatar_color || '#6247f5' }}
                      >
                        {item.message.author.display_name.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-base-content">
                        {item.message.author.display_name}
                      </div>
                      <div className="text-xs text-base-content/60">
                        {formatDate(item.message.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`badge ${getSeverityColor(item.severity)} badge-sm font-bold uppercase`}>
                      {getSeverityLabel(item.severity)}
                    </span>
                    {item.labels.map((label) => (
                      <span key={label} className="badge badge-neutral badge-sm font-bold uppercase">
                        {label.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => toggleExpanded(item.message_id)}
                  className="btn btn-sm btn-ghost border-2 border-base-content/10 font-bold uppercase hover:border-primary/50 transition-all duration-200"
                >
                  {expandedMessageId === item.message_id ? 'Skjul kontekst' : 'Vis kontekst'}
                </button>
              </div>

              {/* Flagged Message */}
              <div className="p-6 bg-error/10">
                <div className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-2">
                  Flagget besked:
                </div>
                <div className="text-sm font-medium text-base-content">
                  {item.message.body}
                </div>
              </div>

              {/* Context Messages */}
              {expandedMessageId === item.message_id && (
                <div className="p-6 border-t-2 border-base-content/10 space-y-4">
                  {/* Messages Before */}
                  {item.context.before.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-3">
                        Beskeder før:
                      </div>
                      <div className="space-y-3">
                        {item.context.before.map((msg) => (
                          <div key={msg.id} className="flex gap-3">
                            <div className="avatar placeholder">
                              <div
                                className="w-8 h-8 text-base-100 text-xs font-bold"
                                style={{ backgroundColor: msg.author.avatar_color || '#6247f5' }}
                              >
                                {msg.author.display_name.substring(0, 2).toUpperCase()}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="text-xs font-bold text-base-content mb-1">
                                {msg.author.display_name}
                              </div>
                              <div className="text-sm text-base-content/80">
                                {msg.body}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages After */}
                  {item.context.after.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-3">
                        Beskeder efter:
                      </div>
                      <div className="space-y-3">
                        {item.context.after.map((msg) => (
                          <div key={msg.id} className="flex gap-3">
                            <div className="avatar placeholder">
                              <div
                                className="w-8 h-8 text-base-100 text-xs font-bold"
                                style={{ backgroundColor: msg.author.avatar_color || '#6247f5' }}
                              >
                                {msg.author.display_name.substring(0, 2).toUpperCase()}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="text-xs font-bold text-base-content mb-1">
                                {msg.author.display_name}
                              </div>
                              <div className="text-sm text-base-content/80">
                                {msg.body}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Details */}
              {item.rule && (
                <div className="p-6 border-t-2 border-base-content/10 bg-base-200/50">
                  <div className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-2">
                    AI Moderation detaljer:
                  </div>
                  <div className="text-xs font-mono text-base-content/80">
                    <div><strong>Regel:</strong> {item.rule}</div>
                    {item.score !== null && <div><strong>Score:</strong> {(item.score * 100).toFixed(2)}%</div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminModerationPage() {
  return (
    <AdminLayout>
      <AdminModerationContent />
    </AdminLayout>
  );
}
