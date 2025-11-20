'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Flag, Check, X, AlertCircle, CheckCircle, AlertTriangle, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';

interface ModerationEventWithContext {
  event_id: string;
  message_id: number;
  class_id: string;
  room_id?: string;
  room?: {
    name: string;
  };
  rule: string;
  score: number;
  labels: string[];
  severity: 'high_severity' | 'moderate_severity';
  status?: string;
  reviewed_by?: string;
  reviewed_at?: string;
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

interface ClassInfo {
  id: string;
  label: string;
  nickname?: string;
  school_name?: string;
}

interface FlaggedMessagesListProps {
  classId?: string;
  isAdmin?: boolean;
  showDismissedCount?: boolean;
}

export default function FlaggedMessagesList({ classId, isAdmin = false, showDismissedCount = false }: FlaggedMessagesListProps) {
  const { user } = useAuth();

  const [flaggedMessages, setFlaggedMessages] = useState<ModerationEventWithContext[]>([]);
  const [archivedMessages, setArchivedMessages] = useState<ModerationEventWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'active' | 'archive'>('active');
  const [severity, setSeverity] = useState<'all' | 'high_severity' | 'moderate_severity'>('all');
  const [confirmedCount, setConfirmedCount] = useState<number>(0);
  const [dismissedCount, setDismissedCount] = useState<number>(0);

  // Filter states
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  // Data for filters
  const [allClasses, setAllClasses] = useState<ClassInfo[]>([]);
  const [allSchools, setAllSchools] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ user_id: string; display_name: string }>>([]);

  // Context display
  const [expandedContext, setExpandedContext] = useState<string | null>(null);
  const [contextMessages, setContextMessages] = useState<any[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);

  // Action handlers
  const handleMarkAsViolation = async (eventId: string) => {
    try {
      const logPrefix = classId ? '[Class Admin - Mark as Violation]' : '[Mark as Violation]';
      console.log(`${logPrefix} Starting for event:`, eventId);
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        console.error(`${logPrefix} No session found`);
        return;
      }

      console.log(`${logPrefix} Sending PATCH request...`);
      const res = await fetch(`/api/moderation/flagged-messages/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      console.log(`${logPrefix} Response status:`, res.status);
      if (res.ok) {
        const data = await res.json();
        console.log(`${logPrefix} Success response:`, data);
        setFlaggedMessages(prev => prev.filter(m => m.event_id !== eventId));
        setConfirmedCount(prev => prev + 1);
      } else {
        const errorData = await res.json();
        console.error(`${logPrefix} Failed:`, res.status, errorData);
        alert(`Kunne ikke markere som overtrædelse: ${errorData.error || 'Ukendt fejl'}`);
      }
    } catch (err) {
      const logPrefix = classId ? '[Class Admin - Mark as Violation]' : '[Mark as Violation]';
      console.error(`${logPrefix} Exception:`, err);
      alert('Der opstod en fejl ved markering af overtrædelse');
    }
  };

  const handleRemoveFlag = async (eventId: string) => {
    try {
      const logPrefix = classId ? '[Class Admin - Remove Flag]' : '[Remove Flag]';
      console.log(`${logPrefix} Starting for event:`, eventId);
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        console.error(`${logPrefix} No session found`);
        return;
      }

      console.log(`${logPrefix} Sending PATCH request...`);
      const res = await fetch(`/api/moderation/flagged-messages/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: 'dismissed' }),
      });

      console.log(`${logPrefix} Response status:`, res.status);
      if (res.ok) {
        const data = await res.json();
        console.log(`${logPrefix} Success response:`, data);
        setFlaggedMessages(prev => prev.filter(m => m.event_id !== eventId));
        setDismissedCount(prev => prev + 1);
      } else {
        const errorData = await res.json();
        console.error(`${logPrefix} Failed:`, res.status, errorData);
        alert(`Kunne ikke fjerne flag: ${errorData.error || 'Ukendt fejl'}`);
      }
    } catch (err) {
      const logPrefix = classId ? '[Class Admin - Remove Flag]' : '[Remove Flag]';
      console.error(`${logPrefix} Exception:`, err);
      alert('Der opstod en fejl ved fjernelse af flag');
    }
  };

  // Handle showing/hiding message context
  const handleShowContext = async (messageId: number, roomId: string) => {
    if (expandedContext === messageId.toString()) {
      setExpandedContext(null);
      setContextMessages([]);
      return;
    }

    setLoadingContext(true);
    setExpandedContext(messageId.toString());

    try {
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

  // Helper functions
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

  // Fetch all classes for filter
  useEffect(() => {
    async function fetchAllClasses() {
      setLoadingClasses(true);
      try {
        const { data, error } = await supabase
          .from('classes')
          .select(`
            id, 
            label, 
            nickname,
            school:schools(name)
          `)
          .order('label');

        if (!error && data) {
          const classesWithSchool = data.map(c => ({
            id: c.id,
            label: c.label,
            nickname: c.nickname,
            school_name: (c.school as any)?.name || null
          }));
          setAllClasses(classesWithSchool);

          const schools = [...new Set(classesWithSchool.map(c => c.school_name).filter(Boolean))] as string[];
          setAllSchools(schools);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
      } finally {
        setLoadingClasses(false);
      }
    }

    fetchAllClasses();
  }, []);

  // Fetch counts
  useEffect(() => {
    async function fetchCounts() {
      if (!user) return;

      try {
        const confirmedQuery = supabase
          .from('moderation_events')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'confirmed');

        const dismissedQuery = supabase
          .from('moderation_events')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'dismissed');

        if (classId) {
          confirmedQuery.eq('class_id', classId);
          dismissedQuery.eq('class_id', classId);
        }

        const [confirmedResult, dismissedResult] = await Promise.all([
          confirmedQuery,
          dismissedQuery
        ]);

        setConfirmedCount(confirmedResult.count || 0);
        setDismissedCount(dismissedResult.count || 0);
      } catch (err) {
        console.error('Error fetching counts:', err);
      }
    }

    fetchCounts();
  }, [user, classId]);

  // Fetch archived messages
  useEffect(() => {
    async function fetchArchivedMessages() {
      if (!user || view !== 'archive') return;

      setLoadingArchive(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session) return;

        const params = new URLSearchParams({
          status: 'confirmed',
        });

        if (classId) {
          params.append('class_id', classId);
        }

        const res = await fetch(`/api/moderation/flagged-messages?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          setArchivedMessages(data.flagged_messages || []);

          const users = data.flagged_messages
            .map((m: ModerationEventWithContext) => ({
              user_id: m.message.author?.user_id,
              display_name: m.message.author?.display_name,
            }))
            .filter((u: any) => u.user_id);

          const uniqueUsers = Array.from(
            new Map(users.map((u: any) => [u.user_id, u])).values()
          ) as Array<{ user_id: string; display_name: string }>;
          setAllUsers(uniqueUsers);
        }
      } catch (err) {
        console.error('Error fetching archived messages:', err);
      } finally {
        setLoadingArchive(false);
      }
    }

    fetchArchivedMessages();
  }, [view, user, classId]);

  // Fetch active flagged messages
  useEffect(() => {
    if (!user || view !== 'active') {
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

        if (classId) {
          params.append('class_id', classId);
        }

        const response = await fetch(
          `/api/moderation/flagged-messages?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch flagged messages');
        }

        const data = await response.json();
        console.log('[Flagged Messages] API returned:', data.flagged_messages?.length, 'messages');
        console.log('[Flagged Messages] First 3 messages reviewed_by:', data.flagged_messages?.slice(0, 3).map((m: any) => ({ id: m.event_id, reviewed_by: m.reviewed_by, reviewed_at: m.reviewed_at })));
        setFlaggedMessages(data.flagged_messages || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchFlaggedMessages();
  }, [classId, severity, user, view]);

  // Filter archived messages
  const filteredArchiveMessages = useMemo(() => {
    return archivedMessages.filter(msg => {
      if (severity !== 'all' && msg.severity !== severity) return false;
      if (filterClass !== 'all' && msg.class_id !== filterClass) return false;
      if (filterSchool !== 'all') {
        const msgClass = allClasses.find(c => c.id === msg.class_id);
        if (msgClass?.school_name !== filterSchool) return false;
      }
      if (filterUser !== 'all' && msg.message.author?.user_id !== filterUser) return false;
      if (searchTerm && !msg.message.body.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [archivedMessages, filterClass, filterSchool, filterUser, searchTerm, allClasses, severity]);

  // Paginate filtered messages
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredArchiveMessages.slice(startIndex, endIndex);
  }, [filteredArchiveMessages, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredArchiveMessages.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterClass, filterSchool, filterUser, searchTerm, severity]);

  if (loading || loadingClasses) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-ball loading-lg text-primary"></span>
          <p className="text-base-content/60 font-medium">Indlæser flaggede beskeder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
        <AlertCircle className="w-16 h-16 stroke-current text-error mx-auto" strokeWidth={2} />
        <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
          Fejl
        </h2>
        <p className="text-base-content/60">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* View Toggle and Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Severity Filter */}
          <div className="join">
            <input
              className="join-item btn btn-sm"
              type="radio"
              name={`severity-${classId || 'global'}`}
              aria-label="Alle"
              checked={severity === 'all'}
              onChange={() => setSeverity('all')}
            />
            <input
              className="join-item btn btn-sm"
              type="radio"
              name={`severity-${classId || 'global'}`}
              aria-label="Høj"
              checked={severity === 'high_severity'}
              onChange={() => setSeverity('high_severity')}
            />
            <input
              className="join-item btn btn-sm"
              type="radio"
              name={`severity-${classId || 'global'}`}
              aria-label="Moderat"
              checked={severity === 'moderate_severity'}
              onChange={() => setSeverity('moderate_severity')}
            />
          </div>

          {/* Archive Toggle */}
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
            <div className="px-6 py-3 pl-8">
              <span className="text-sm font-bold uppercase tracking-wide text-base-content">
                {view === 'active' ? 'Vis arkiv' : 'Vis aktive'}
              </span>
            </div>
          </button>
        </div>

        {/* Archive filters */}
        {view === 'archive' && (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Filtre</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {isAdmin && (
                <>
                  <label className="label">
                    <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">Klasse</span>
                    <select
                      className="select select-sm w-full"
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                    >
                      <option value="all">Alle klasser</option>
                      {allClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nickname || c.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="label">
                    <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">Skole</span>
                    <select
                      className="select select-sm w-full"
                      value={filterSchool}
                      onChange={(e) => setFilterSchool(e.target.value)}
                    >
                      <option value="all">Alle skoler</option>
                      {allSchools.map((school) => (
                        <option key={school} value={school}>
                          {school}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              <label className="label">
                <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">Bruger</span>
                <select
                  className="select select-sm w-full"
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                >
                  <option value="all">Alle brugere</option>
                  {allUsers.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.display_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="label">
                <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">Søg</span>
                <input
                  type="text"
                  placeholder="Søg i beskeder..."
                  className="input input-sm w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {view === 'archive' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
            <div className="flex items-start justify-between mb-3">
              <CheckCircle className="w-6 h-6 stroke-current text-success" strokeWidth={2} />
              <span className="text-2xl font-black text-base-content">{confirmedCount}</span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-tight text-base-content">
              Bekræftede overtrædelser
            </h3>
          </div>

          {showDismissedCount && (
            <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <X className="w-6 h-6 stroke-current text-info" strokeWidth={2} />
                <span className="text-2xl font-black text-base-content">{dismissedCount}</span>
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight text-base-content">
                AI fejldetektioner
              </h3>
            </div>
          )}

          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
            <div className="flex items-start justify-between mb-3">
              <MessageSquare className="w-6 h-6 stroke-current text-base-content/50" strokeWidth={2} />
              <span className="text-2xl font-black text-base-content">{filteredArchiveMessages.length}</span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-tight text-base-content">
              Beskeder i arkiv
            </h3>
          </div>
        </div>
      )}

      {/* Active Messages */}
      {view === 'active' && (
        <>
          {flaggedMessages.length === 0 ? (
            <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
              <CheckCircle className="w-16 h-16 stroke-current text-success mx-auto" strokeWidth={2} />
              <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
                Ingen flaggede beskeder
              </h2>
              <p className="text-base-content/60">Alle beskeder er godkendt af AI-moderation</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-base-content/60">
                  {flaggedMessages.length} {flaggedMessages.length === 1 ? 'besked' : 'beskeder'} kræver gennemsyn
                </p>
              </div>
              {/* Messages will be rendered here - continuing in next part */}
            </div>
          )}
        </>
      )}

      {/* Archive Messages */}
      {view === 'archive' && (
        <>
          {loadingArchive ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-ball loading-lg text-primary"></span>
            </div>
          ) : paginatedMessages.length === 0 ? (
            <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
              <AlertCircle className="w-16 h-16 stroke-current text-base-content/50 mx-auto" strokeWidth={2} />
              <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
                Ingen arkiverede beskeder
              </h2>
              <p className="text-base-content/60">Der er ingen beskeder i arkivet endnu</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pagination info */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-base-content/60">
                  Viser {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredArchiveMessages.length)} af {filteredArchiveMessages.length}
                </p>
                {totalPages > 1 && (
                  <div className="join">
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      «
                    </button>
                    <button className="join-item btn btn-sm">
                      Side {currentPage} af {totalPages}
                    </button>
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      »
                    </button>
                  </div>
                )}
              </div>
              {/* Messages will be rendered here */}
            </div>
          )}
        </>
      )}
    </div>
  );
}
