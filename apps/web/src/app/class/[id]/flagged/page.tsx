'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import { da } from 'date-fns/locale';
import { ArrowLeft, AlertTriangle, MessageSquare, Check, X, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import UserMenu from '@/components/UserMenu';

interface FlaggedMessage {
  event_id: string;
  message_id: number;
  class_id: string;
  room_id: string;
  room?: {
    name: string;
  };
  rule: string;
  score: number;
  labels: string[];
  severity: string;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  message: {
    id: number;
    body: string;
    user_id: string;
    room_id: string;
    created_at: string;
    author: {
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
      author: {
        user_id: string;
        display_name: string;
        avatar_url?: string;
      };
    }>;
    after: Array<{
      id: number;
      body: string;
      user_id: string;
      created_at: string;
      author: {
        user_id: string;
        display_name: string;
        avatar_url?: string;
      };
    }>;
  };
}

export default function ClassFlaggedMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: classId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { profile, isClassAdmin, loading: profileLoading } = useUserProfile(classId);
  
  const [messages, setMessages] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'active' | 'archive'>('active');
  const [severity, setSeverity] = useState<'all' | 'high_severity' | 'moderate_severity'>('all');
  const [className, setClassName] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [confirmedCount, setConfirmedCount] = useState<number>(0);
  const [archivedMessages, setArchivedMessages] = useState<FlaggedMessage[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [expandedContext, setExpandedContext] = useState<string | null>(null);
  const [contextMessages, setContextMessages] = useState<any[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);

  // Check access - wait for both user AND profile to load before determining access
  const canAccess = profile?.role === 'admin' || isClassAdmin;
  const accessDenied = user && !profileLoading && !canAccess;

  // Action handlers
  const handleMarkAsViolation = async (eventId: string) => {
    try {
      console.log('[Class Admin - Mark as Violation] Starting for event:', eventId);
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        console.error('[Class Admin - Mark as Violation] No session found');
        return;
      }

      console.log('[Class Admin - Mark as Violation] Sending PATCH request...');
      const res = await fetch(`/api/moderation/flagged-messages/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      console.log('[Class Admin - Mark as Violation] Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[Class Admin - Mark as Violation] Success response:', data);
        setMessages(prev => prev.filter(m => m.event_id !== eventId));
        setConfirmedCount(prev => prev + 1);
      } else {
        const errorData = await res.json();
        console.error('[Class Admin - Mark as Violation] Failed:', res.status, errorData);
        alert(`Kunne ikke markere som overtrædelse: ${errorData.error || 'Ukendt fejl'}`);
      }
    } catch (err) {
      console.error('[Class Admin - Mark as Violation] Exception:', err);
      alert('Der opstod en fejl ved markering af overtrædelse');
    }
  };

  const handleRemoveFlag = async (eventId: string) => {
    try {
      console.log('[Class Admin - Remove Flag] Starting for event:', eventId);
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        console.error('[Class Admin - Remove Flag] No session found');
        return;
      }

      console.log('[Class Admin - Remove Flag] Sending PATCH request...');
      const res = await fetch(`/api/moderation/flagged-messages/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: 'dismissed' }),
      });

      console.log('[Class Admin - Remove Flag] Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[Class Admin - Remove Flag] Success response:', data);
        setMessages(prev => prev.filter(m => m.event_id !== eventId));
      } else {
        const errorData = await res.json();
        console.error('[Class Admin - Remove Flag] Failed:', res.status, errorData);
        alert(`Kunne ikke fjerne flag: ${errorData.error || 'Ukendt fejl'}`);
      }
    } catch (err) {
      console.error('[Class Admin - Remove Flag] Exception:', err);
      alert('Der opstod en fejl ved fjernelse af flag');
    }
  };

  const handleShowContext = async (messageId: number, roomId: string) => {
    if (expandedContext === messageId.toString()) {
      // Collapse context
      setExpandedContext(null);
      setContextMessages([]);
      return;
    }

    setLoadingContext(true);
    setExpandedContext(messageId.toString());
    
    try {
      // Fetch the flagged message itself
      const { data: flaggedMessage } = await supabase
        .from('messages')
        .select(`
          id,
          body,
          user_id,
          created_at,
          profiles (
            user_id,
            display_name,
            avatar_url,
            avatar_color
          )
        `)
        .eq('id', messageId)
        .single();

      // Fetch messages before and after
      const { data: beforeMessages } = await supabase
        .from('messages')
        .select(`
          id,
          body,
          user_id,
          created_at,
          profiles (
            user_id,
            display_name,
            avatar_url,
            avatar_color
          )
        `)
        .eq('room_id', roomId)
        .lt('id', messageId)
        .order('id', { ascending: false })
        .limit(20);

      const { data: afterMessages } = await supabase
        .from('messages')
        .select(`
          id,
          body,
          user_id,
          created_at,
          profiles (
            user_id,
            display_name,
            avatar_url,
            avatar_color
          )
        `)
        .eq('room_id', roomId)
        .gt('id', messageId)
        .order('id', { ascending: true })
        .limit(10);

      // Put flagged message first, then messages before (oldest to newest), then messages after
      const allMessages = [
        ...(flaggedMessage ? [flaggedMessage] : []),
        ...(beforeMessages || []),
        ...(afterMessages || [])
      ];

      setContextMessages(allMessages);
    } catch (err) {
      console.error('Error loading context:', err);
    } finally {
      setLoadingContext(false);
    }
  };

  // Helper function to get user-friendly label translations
  const getLabelTranslation = (label: string): string => {
    const translations: Record<string, string> = {
      'harassment': 'Chikane',
      'harassment/threatening': 'Truende adfærd',
      'hate': 'Hadefulde ytringer',
      'hate/threatening': 'Hadefulde trusler',
      'self-harm': 'Selvskade',
      'self-harm/intent': 'Selvskade intention',
      'self-harm/instructions': 'Selvskade instruktioner',
      'sexual': 'Seksuelt indhold',
      'sexual/minors': 'Seksuelt indhold (mindreårige)',
      'violence': 'Vold',
      'violence/graphic': 'Grafisk vold',
      'illicit': 'Ulovligt indhold',
      'illicit/violent': 'Ulovlig vold',
    };
    return translations[label] || label;
  };

  // Helper function to get user-friendly severity description
  const getSeverityDescription = (severity: string, labels: string[]): string => {
    if (severity === 'high_severity') {
      return 'Denne besked indeholder alvorligt problematisk indhold der overtræder reglerne.';
    }
    if (severity === 'moderate_severity') {
      if (labels.some(l => l.includes('harassment'))) {
        return 'Denne besked kan opfattes som chikane eller mobning.';
      }
      if (labels.some(l => l.includes('hate'))) {
        return 'Denne besked kan indeholde hadefulde ytringer.';
      }
      if (labels.some(l => l.includes('violence'))) {
        return 'Denne besked kan indeholde voldsomt indhold.';
      }
      return 'Denne besked kan være upassende eller stødende.';
    }
    return 'Denne besked er blevet markeret til gennemsyn.';
  };

  useEffect(() => {
    async function fetchClassInfo() {
      try {
        const { data } = await supabase
          .from('classes')
          .select(`
            label,
            schools (
              name
            )
          `)
          .eq('id', classId)
          .single();
        if (data) {
          setClassName(data.label);
          // @ts-ignore - Supabase types may be incorrect for single relationship
          setSchoolName(data.schools?.name || '');
        }
      } catch (err) {
        console.error('Error fetching class info:', err);
      }
    }
    
    async function fetchConfirmedCount() {
      try {
        const { count } = await supabase
          .from('moderation_events')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classId)
          .eq('status', 'confirmed');
        setConfirmedCount(count || 0);
      } catch (err) {
        console.error('Error fetching confirmed count:', err);
      }
    }
    
    if (classId) {
      fetchClassInfo();
      fetchConfirmedCount();
    }
  }, [classId]);

  useEffect(() => {
    async function fetchArchivedMessages() {
      if (!canAccess || !user || view !== 'archive') return;
      
      setLoadingArchive(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session) return;

        const params = new URLSearchParams({
          class_id: classId,
          status: 'confirmed',
        });

        const res = await fetch(`/api/moderation/flagged-messages?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          setArchivedMessages(data.flagged_messages || []);
        }
      } catch (err) {
        console.error('Error fetching archived messages:', err);
      } finally {
        setLoadingArchive(false);
      }
    }

    fetchArchivedMessages();
  }, [view, canAccess, user, classId]);

  useEffect(() => {
    async function fetchFlaggedMessages() {
      if (!canAccess || !user || view !== 'active') {
        setLoading(false);
        return;
      }

      setLoading(true); // Start loading

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session) {
          setError('Ingen session fundet');
          setLoading(false);
          return;
        }

        const params = new URLSearchParams({
          class_id: classId,
        });
        
        if (severity !== 'all') {
          params.append('severity', severity);
        }

        const res = await fetch(`/api/moderation/flagged-messages?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('API error:', res.status, errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        console.log('API response:', data);
        console.log('Flagged messages count:', data.flagged_messages?.length || 0);
        setMessages(data.flagged_messages || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchFlaggedMessages();
  }, [canAccess, user, classId, severity]);

  // Show loading while checking access or waiting for user to load
  if (!user || profileLoading) {
    return (
      <div className="flex flex-col h-screen bg-base-300">
        <header className="bg-base-100 border-b-2 border-base-content/10">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-12 py-4">
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => router.push(`/?class=${classId}`)}
                className="btn btn-ghost btn-square"
              >
                <ArrowLeft size={24} strokeWidth={2} />
              </button>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-base-content">
                  Flaggede Beskeder
                </h1>
              </div>
              <div className="w-10 h-10"></div>
            </div>
          </div>
        </header>

        {/* Filters placeholder */}
        <div className="bg-base-100 border-b-2 border-base-content/10">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-12 py-4">
            <div className="h-8"></div>
          </div>
        </div>

        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-ball loading-lg text-primary"></span>
            <p className="text-base-content/60 font-medium">Indlæser...</p>
          </div>
        </main>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col h-screen bg-base-300">
        <header className="bg-base-100 border-b-2 border-base-content/10">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-12 py-4 flex items-center gap-4">
            <button
              onClick={() => router.push(`/?class=${classId}`)}
              className="btn btn-ghost btn-square"
            >
              <ArrowLeft size={24} strokeWidth={2} />
            </button>
            <h1 className="text-2xl font-black uppercase tracking-tight text-base-content">
              Adgang Nægtet
            </h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-base-content/60">Du har ikke adgang til denne side.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-base-300">
      {/* Header */}
      <header className="bg-base-100 border-b-2 border-base-content/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-12 py-4">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => router.push(`/?class=${classId}`)}
              className="btn btn-ghost btn-square"
            >
              <ArrowLeft size={24} strokeWidth={2} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-base-content">
                Flaggede Beskeder
              </h1>
              {(schoolName || className) && (
                <p className="text-xs font-mono uppercase tracking-wider text-base-content/50 mt-1">
                  {schoolName && <span>{schoolName}</span>}
                  {schoolName && className && <span className="mx-2">•</span>}
                  {className && <span>{className}</span>}
                </p>
              )}
            </div>
            <UserMenu 
              userName={profile?.display_name || user?.user_metadata?.display_name || user?.email}
              userRole={(profile?.role === 'child' ? 'Elev' : profile?.role === 'guardian' ? 'Forælder' : 'Voksen') + (isClassAdmin ? ' ⊕' : '')}
              avatarUrl={profile?.avatar_url}
            />
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-base-100 border-b-2 border-base-content/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-12 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setSeverity('all')}
                className={`btn btn-sm ${severity === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Alle
              </button>
              <button
                onClick={() => setSeverity('high_severity')}
                className={`btn btn-sm ${severity === 'high_severity' ? 'btn-error' : 'btn-ghost'}`}
              >
                Høj
              </button>
              <button
                onClick={() => setSeverity('moderate_severity')}
                className={`btn btn-sm ${severity === 'moderate_severity' ? 'btn-warning' : 'btn-ghost'}`}
              >
                Moderat
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView(view === 'active' ? 'archive' : 'active')}
                className={`relative group transition-all duration-200 cursor-pointer ${
                  view === 'archive' 
                    ? 'bg-secondary/10 border-2 border-secondary hover:bg-secondary/20' 
                    : 'bg-base-100 border-2 border-base-content/10 hover:border-secondary/50 hover:bg-secondary/5'
                }`}
              >
                <div className={`absolute left-0 top-0 h-full transition-all duration-200 ${
                  view === 'archive' 
                    ? 'w-1 bg-secondary' 
                    : 'w-0 bg-secondary group-hover:w-1'
                }`}></div>
                <div className="px-4 py-2 pl-5 flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    view === 'archive' ? 'text-secondary' : 'text-base-content'
                  }`}>
                    Arkiv
                  </span>
                  <span className={`badge badge-xs font-bold ${
                    view === 'archive' ? 'badge-secondary' : 'badge-ghost'
                  }`}>
                    {confirmedCount}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-12 py-8">
          {view === 'archive' ? (
            /* Archive Table View */
            <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
              <div className="p-6 border-b-2 border-base-content/10">
                <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                  Arkiverede Beskeder
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr className="border-b-2 border-base-content/10">
                      <th className="text-xs font-black uppercase tracking-widest">Dato</th>
                      <th className="text-xs font-black uppercase tracking-widest">Bruger</th>
                      <th className="text-xs font-black uppercase tracking-widest">Kanal</th>
                      <th className="text-xs font-black uppercase tracking-widest">Besked</th>
                      <th className="text-xs font-black uppercase tracking-widest">Alvorlighed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingArchive ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8">
                          <span className="loading loading-spinner loading-sm"></span>
                        </td>
                      </tr>
                    ) : archivedMessages.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-base-content/60">
                          Ingen arkiverede beskeder
                        </td>
                      </tr>
                    ) : (
                      archivedMessages.map((item) => (
                        <tr key={item.event_id} className="hover:bg-base-200">
                          <td className="text-xs">
                            {format(new Date(item.message.created_at), 'dd/MM/yyyy HH:mm', { locale: da })}
                          </td>
                          <td className="text-xs font-bold">{item.message.author.display_name}</td>
                          <td className="text-xs font-mono">#{item.room?.name || 'N/A'}</td>
                          <td className="text-xs max-w-md truncate">{item.message.body}</td>
                          <td>
                            <span className={`badge badge-xs ${
                              item.severity === 'high_severity' ? 'badge-error' : 'badge-warning'
                            }`}>
                              {item.severity === 'high_severity' ? 'Høj' : 'Moderat'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-base-100 border-2 border-base-content/10">
                  {/* Header Skeleton */}
                  <div className="flex items-start gap-4 p-6 border-b-2 border-base-content/10">
                    <div className="skeleton w-10 h-10 rounded-full shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-32"></div>
                      <div className="skeleton h-3 w-16"></div>
                    </div>
                  </div>
                  
                  {/* Message Content Skeleton */}
                  <div className="p-6 space-y-2">
                    <div className="skeleton h-4 w-full"></div>
                    <div className="skeleton h-4 w-3/4"></div>
                  </div>
                  
                  {/* Moderation Info Skeleton */}
                  <div className="p-6 pt-0">
                    <div className="bg-base-200 p-4 border-l-4 border-base-content/10">
                      <div className="flex items-start gap-3">
                        <div className="skeleton w-5 h-5 shrink-0"></div>
                        <div className="flex-1 space-y-2">
                          <div className="skeleton h-3 w-24"></div>
                          <div className="skeleton h-3 w-48"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-error/10 border-2 border-error/20 p-6 text-center">
              <p className="text-error font-medium">{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <MessageSquare className="w-16 h-16 text-base-content/20 mb-4" strokeWidth={1.5} />
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content mb-2">
                Ingen Flaggede Beskeder
              </h2>
              <p className="text-base-content/60 max-w-md">
                Der er ingen beskeder der matcher de valgte filtre.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((item) => {
                const severityColor =
                  item.severity === 'high_severity' ? 'error' :
                  item.severity === 'moderate_severity' ? 'warning' :
                  'info';

                return (
                  <div
                    key={item.event_id}
                    className="bg-base-100 border-2 border-base-content/10 hover:border-primary/30 transition-colors"
                  >
                    {/* Compact Header */}
                    <div className="flex items-start gap-3 p-4 border-b border-base-content/10">
                      <div className="avatar">
                        <div className="w-8 h-8 rounded-full">
                          {item.message.author.avatar_url ? (
                            <img src={item.message.author.avatar_url} alt={item.message.author.display_name} />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center font-black text-xs text-white"
                              style={{ backgroundColor: item.message.author.avatar_color || '#10B981' }}
                            >
                              {item.message.author.display_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-base-content">
                            {item.message.author.display_name}
                          </span>
                          <span className="text-xs text-base-content/40">
                            {formatDistanceToNow(new Date(item.message.created_at), {
                              addSuffix: true,
                              locale: da,
                            })}
                          </span>
                          {item.room?.name && (
                            <span className="badge badge-sm badge-ghost font-mono text-xs">
                              #{item.room.name}
                            </span>
                          )}
                          <span className={`badge badge-${severityColor} badge-xs font-bold uppercase ml-auto`}>
                            {item.severity === 'high_severity' ? 'Høj' : 
                             item.severity === 'moderate_severity' ? 'Moderat' : 'Info'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Compact Message Content */}
                    <div className="p-4">
                      <p className="text-sm text-base-content whitespace-pre-wrap wrap-break-word">
                        {item.message.body}
                      </p>
                    </div>

                    {/* Compact Moderation Info */}
                    <div className="px-4 pb-4">
                      <div className={`bg-base-200 p-3 border-l-2 ${
                        severityColor === 'error' ? 'border-error' :
                        severityColor === 'warning' ? 'border-warning' :
                        'border-info'
                      }`}>
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`w-4 h-4 ${
                            severityColor === 'error' ? 'text-error' :
                            severityColor === 'warning' ? 'text-warning' :
                            'text-info'
                          } shrink-0 mt-0.5`} strokeWidth={2} />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-base-content mb-1">
                              {getSeverityDescription(item.severity, item.labels)}
                            </p>
                            {item.labels.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {item.labels.map((label, idx) => (
                                  <span key={idx} className={`badge badge-xs badge-${severityColor}`}>
                                    {getLabelTranslation(label)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reviewed Status */}
                    {item.reviewed_by && item.reviewed_at && (
                      <div className="px-4 py-3 bg-base-200 border-t-2 border-base-content/10">
                        <div className="flex items-center gap-2">
                          {item.status === 'confirmed' ? (
                            <Check className="w-4 h-4 text-success" strokeWidth={2} />
                          ) : (
                            <X className="w-4 h-4 text-base-content/60" strokeWidth={2} />
                          )}
                          <p className="text-xs text-base-content/60">
                            <span className="font-bold">
                              {item.status === 'confirmed' ? 'Noteret' : 'Flag fjernet'}
                            </span>
                            {' '}
                            {item.reviewed_by === user?.id ? 'af dig' : 'af anden moderator'}
                            {' • '}
                            {formatDistanceToNow(new Date(item.reviewed_at), { 
                              addSuffix: true, 
                              locale: da 
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {!item.reviewed_by || item.reviewed_by === user?.id ? (
                      <div className="px-4 pb-4 flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleMarkAsViolation(item.event_id)}
                          className="btn btn-sm btn-ghost gap-2 text-success hover:bg-success/10"
                        >
                          <Check size={16} strokeWidth={2} />
                          Noteret
                        </button>
                        <button
                          onClick={() => handleRemoveFlag(item.event_id)}
                          className="btn btn-sm btn-ghost gap-2"
                        >
                          <X size={16} strokeWidth={2} />
                          Fjern flag
                        </button>
                        <button
                          onClick={() => handleShowContext(item.message_id, item.room_id)}
                          className="btn btn-sm btn-ghost gap-2"
                        >
                          {expandedContext === item.message_id.toString() ? (
                            <ChevronUp size={16} strokeWidth={2} />
                          ) : (
                            <ChevronDown size={16} strokeWidth={2} />
                          )}
                          Se kontekst
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => handleShowContext(item.message_id, item.room_id)}
                          className="btn btn-sm btn-ghost gap-2"
                        >
                          {expandedContext === item.message_id.toString() ? (
                            <ChevronUp size={16} strokeWidth={2} />
                          ) : (
                            <ChevronDown size={16} strokeWidth={2} />
                          )}
                          Se kontekst
                        </button>
                      </div>
                    )}

                    {/* Context Messages */}
                    {expandedContext === item.message_id.toString() && (
                      <div className="border-t-2 border-base-content/10 bg-base-200">
                        {loadingContext ? (
                          <div className="p-6 flex justify-center">
                            <span className="loading loading-spinner loading-sm"></span>
                          </div>
                        ) : (
                          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                            <p className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-3">
                              Besked kontekst
                            </p>
                            {contextMessages.map((msg: any, index: number) => {
                              const isFlagged = msg.id === item.message_id;
                              const flaggedMsg = contextMessages.find((m: any) => m.id === item.message_id);
                              const flaggedTime = flaggedMsg ? new Date(flaggedMsg.created_at) : null;
                              const msgTime = new Date(msg.created_at);
                              
                              // Calculate time difference relative to flagged message
                              let timeLabel = '';
                              if (!isFlagged && flaggedTime) {
                                const diffMs = msgTime.getTime() - flaggedTime.getTime();
                                const diffMins = Math.round(diffMs / 60000);
                                const absDiffMins = Math.abs(diffMins);
                                
                                if (diffMins === 0) {
                                  timeLabel = 'Samme tid';
                                } else {
                                  const suffix = diffMins > 0 ? 'efter' : 'før';
                                  
                                  if (absDiffMins < 60) {
                                    // Less than 1 hour: show minutes
                                    timeLabel = `${absDiffMins} ${absDiffMins === 1 ? 'minut' : 'minutter'} ${suffix}`;
                                  } else if (absDiffMins < 1440) {
                                    // Less than 24 hours: show hours
                                    const hours = Math.round(absDiffMins / 60);
                                    timeLabel = `${hours} ${hours === 1 ? 'time' : 'timer'} ${suffix}`;
                                  } else {
                                    // 24 hours or more: show days
                                    const days = Math.round(absDiffMins / 1440);
                                    timeLabel = `${days} ${days === 1 ? 'dag' : 'dage'} ${suffix}`;
                                  }
                                }
                              }
                              
                              return (
                                <div
                                  key={msg.id}
                                  className={`p-3 rounded relative ${
                                    isFlagged
                                      ? 'bg-warning/20 border-2 border-warning shadow-lg'
                                      : 'bg-base-100'
                                  }`}
                                >
                                  {isFlagged && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-warning"></div>
                                  )}
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="avatar">
                                      <div className="w-6 h-6 rounded-full">
                                        {msg.profiles?.avatar_url ? (
                                          <img src={msg.profiles.avatar_url} alt={msg.profiles.display_name} />
                                        ) : (
                                          <div
                                            className="w-full h-full flex items-center justify-center font-bold text-xs text-white"
                                            style={{ backgroundColor: msg.profiles?.avatar_color || '#10B981' }}
                                          >
                                            {msg.profiles?.display_name?.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <span className={`text-xs font-bold ${isFlagged ? 'text-warning-content' : 'text-base-content'}`}>
                                      {msg.profiles?.display_name}
                                    </span>
                                    <span className="text-xs text-base-content/40">
                                      {timeLabel || format(new Date(msg.created_at), 'PPp', { locale: da })}
                                    </span>
                                    {isFlagged && (
                                      <span className="badge badge-warning badge-xs ml-auto font-bold uppercase">
                                        Markeret
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-xs ml-8 ${isFlagged ? 'font-medium text-base-content' : 'text-base-content'}`}>
                                    {msg.body}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
