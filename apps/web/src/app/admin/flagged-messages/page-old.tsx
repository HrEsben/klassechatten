'use client';

import { useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserClasses } from '@/hooks/useUserClasses';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import FlaggedMessagesList from '@/components/FlaggedMessagesList';
import { Flag, AlertCircle } from 'lucide-react';

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

export default function FlaggedMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get('class_id');
  const { user } = useAuth();
  const { profile, isClassAdmin, loading: profileLoading } = useUserProfile(classId || '');
  const { classes, loading: classesLoading } = useUserClasses();
  const hasAnyClassAdmin = classes?.some?.((c) => c.is_class_admin);

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

  // Permission check: must be admin or class admin for the class
  const isAdmin = profile?.role === 'admin';
  const isTeacher = profile?.role === 'adult';
  const canAccess = isAdmin || (isClassAdmin && !!classId) || (isTeacher && !!classId);

  // Action handlers
  const handleMarkAsViolation = async (eventId: string) => {
    try {
      console.log('[Mark as Violation] Starting for event:', eventId);
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        console.error('[Mark as Violation] No session found');
        return;
      }

      console.log('[Mark as Violation] Sending PATCH request...');
      const res = await fetch(`/api/moderation/flagged-messages/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      console.log('[Mark as Violation] Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[Mark as Violation] Success response:', data);
        setFlaggedMessages(prev => prev.filter(m => m.event_id !== eventId));
        setConfirmedCount(prev => prev + 1);
      } else {
        const errorData = await res.json();
        console.error('[Mark as Violation] Failed:', res.status, errorData);
        alert(`Kunne ikke markere som overtrædelse: ${errorData.error || 'Ukendt fejl'}`);
      }
    } catch (err) {
      console.error('[Mark as Violation] Exception:', err);
      alert('Der opstod en fejl ved markering af overtrædelse');
    }
  };

  const handleRemoveFlag = async (eventId: string) => {
    try {
      console.log('[Remove Flag] Starting for event:', eventId);
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        console.error('[Remove Flag] No session found');
        return;
      }

      console.log('[Remove Flag] Sending PATCH request...');
      const res = await fetch(`/api/moderation/flagged-messages/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: 'dismissed' }),
      });

      console.log('[Remove Flag] Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[Remove Flag] Success response:', data);
        setFlaggedMessages(prev => prev.filter(m => m.event_id !== eventId));
        setDismissedCount(prev => prev + 1);
      } else {
        const errorData = await res.json();
        console.error('[Remove Flag] Failed:', res.status, errorData);
        alert(`Kunne ikke fjerne flag: ${errorData.error || 'Ukendt fejl'}`);
      }
    } catch (err) {
      console.error('[Remove Flag] Exception:', err);
      alert('Der opstod en fejl ved fjernelse af flag');
    }
  };

  // Handle showing/hiding message context
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

  // Fetch all classes for filter and display
  useEffect(() => {
    async function fetchAllClasses() {
      // Fetch for everyone, not just admins, so we can show class names in archive
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
          // Transform data to include school_name at top level
          const classesWithSchool = data.map(c => ({
            id: c.id,
            label: c.label,
            nickname: c.nickname,
            school_name: (c.school as any)?.name || null
          }));
          setAllClasses(classesWithSchool);
          
          // Extract unique schools
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

  // Fetch confirmed and dismissed counts
  useEffect(() => {
    async function fetchCounts() {
      if (!canAccess) return;
      
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
  }, [canAccess, classId]);

  // Fetch archived messages
  useEffect(() => {
    async function fetchArchivedMessages() {
      if (!canAccess || !user || view !== 'archive') return;
      
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
          
          // Extract unique users for filter
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
  }, [view, canAccess, user, classId]);

  // Apply filters to archived messages
  const filteredArchiveMessages = useMemo(() => {
    return archivedMessages.filter(msg => {
      // Severity filter
      if (severity !== 'all' && msg.severity !== severity) return false;
      
      // Class filter
      if (filterClass !== 'all' && msg.class_id !== filterClass) return false;
      
      // School filter
      if (filterSchool !== 'all') {
        const msgClass = allClasses.find(c => c.id === msg.class_id);
        if (msgClass?.school_name !== filterSchool) return false;
      }
      
      // User filter
      if (filterUser !== 'all' && msg.message.author?.user_id !== filterUser) return false;
      
      // Search term
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
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredArchiveMessages.length / itemsPerPage);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterClass, filterSchool, filterUser, searchTerm, severity]);

  useEffect(() => {
    // Wait until profile loading finishes before deciding access
    if (profileLoading) {
      setLoading(true);
      return;
    }

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

    // Only fetch active messages when in active view
    if (view !== 'active') {
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
  }, [canAccess, classId, isClassAdmin, severity, user, profileLoading, hasAnyClassAdmin, isTeacher, view]);

  // Show loading while profile is loading OR while fetching messages OR while loading classes
  if (loading || profileLoading || loadingClasses) {
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

  // Only show error after profile has loaded AND error exists AND not loading AND classes loaded
  if (error && !profileLoading && !loading && !loadingClasses) {
    return (
      <AdminLayout>
        <div className="w-full max-w-7xl mx-auto px-12 py-8">
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
            <AlertCircle className="w-16 h-16 stroke-current text-error mx-auto" strokeWidth={2} />
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

        {/* View Toggle and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Severity Filter */}
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
              <div className="px-4 py-2 pl-5 flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  view === 'archive' ? 'text-secondary' : 'text-base-content'
                }`}>
                  Bekræftede overtrædelser
                </span>
                <span className={`badge badge-xs font-bold ${
                  view === 'archive' ? 'badge-secondary' : 'badge-ghost'
                }`}>
                  {confirmedCount}
                </span>
              </div>
            </button>
            
            {/* Dismissed Count - Read-only indicator */}
            {isAdmin && (
              <div className="bg-base-100 border-2 border-base-content/10">
                <div className="px-4 py-2 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-base-content/60">
                    AI fejldetektioner
                  </span>
                  <span className="badge badge-xs badge-ghost font-bold">
                    {dismissedCount}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Additional Filters (for Admin and Archive view) */}
          {(isAdmin || view === 'archive') && (
            <div className="flex gap-4 flex-wrap items-center">
              {/* School Filter */}
              {isAdmin && allSchools.length > 0 && (
                <select 
                  className="select select-sm select-ghost"
                  value={filterSchool}
                  onChange={(e) => setFilterSchool(e.target.value)}
                >
                  <option value="all">Alle skoler</option>
                  {allSchools.map(school => (
                    <option key={school} value={school}>{school}</option>
                  ))}
                </select>
              )}

              {/* Class Filter */}
              {isAdmin && allClasses.length > 0 && (
                <select 
                  className="select select-sm select-ghost"
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                >
                  <option value="all">Alle klasser</option>
                  {allClasses
                    .filter(c => filterSchool === 'all' || c.school_name === filterSchool)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nickname || c.label}{c.school_name ? ` (${c.school_name})` : ''}
                      </option>
                    ))
                  }
                </select>
              )}

              {/* User Filter (Archive only) */}
              {view === 'archive' && allUsers.length > 0 && (
                <select 
                  className="select select-sm select-ghost"
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                >
                  <option value="all">Alle brugere</option>
                  {allUsers.map(u => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.display_name}
                    </option>
                  ))}
                </select>
              )}

              {/* Search */}
              {view === 'archive' && (
                <input
                  type="text"
                  placeholder="Søg i beskeder..."
                  className="input input-sm input-ghost"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              )}

              {/* Count */}
              <div className="text-sm text-base-content/60">
                {view === 'active' 
                  ? `${flaggedMessages.length} besked${flaggedMessages.length !== 1 ? 'er' : ''}`
                  : `${confirmedCount} arkiverede besked${confirmedCount !== 1 ? 'er' : ''}`
                }
              </div>
            </div>
          )}
        </div>

        {/* Messages - Active View */}
        {view === 'active' && (
          <>
            {flaggedMessages.length === 0 ? (
              <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
                <MessageSquare className="w-16 h-16 stroke-current text-secondary mx-auto" strokeWidth={2} />
                <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
                  Ingen flaggede beskeder
                </h2>
                <p className="text-base-content/60">
                  Alle beskeder er godkendt af AI-moderation
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {flaggedMessages.map((item) => {
                  const severityColor = item.severity === 'high_severity' ? 'error' : 'warning';
                  
                  return (
                    <div
                      key={item.event_id}
                      className="bg-base-100 border-2 border-base-content/10 hover:border-primary/30 transition-all duration-200 overflow-hidden"
                    >
                      {/* Compact Header */}
                      <div className="p-4 border-b-2 border-base-content/10">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="avatar">
                            <div className="w-8 h-8 rounded-full">
                              {item.message?.author?.avatar_url ? (
                                <img
                                  src={item.message.author.avatar_url}
                                  alt={item.message.author.display_name}
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center font-bold text-xs text-white"
                                  style={{
                                    backgroundColor: item.message?.author?.avatar_color || '#10B981',
                                  }}
                                >
                                  {item.message?.author?.display_name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Author & Metadata */}
                          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            <span className="text-sm font-bold text-base-content">
                              {item.message?.author?.display_name || 'Ukendt bruger'}
                            </span>
                            <span className="text-xs text-base-content/40">
                              {formatDistanceToNow(new Date(item.message?.created_at || ''), {
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
                          {item.message?.body || '(Ingen besked)'}
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
                            onClick={() => handleShowContext(item.message_id, item.room_id || '')}
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
                            onClick={() => handleShowContext(item.message_id, item.room_id || '')}
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
          </>
        )}

        {/* Archive View */}
        {view === 'archive' && (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6 border-b-2 border-base-content/10 flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                Arkiverede Beskeder
              </h2>
              <div className="text-sm text-base-content/60">
                Viser {paginatedMessages.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredArchiveMessages.length)} af {filteredArchiveMessages.length}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr className="border-b-2 border-base-content/10">
                    <th className="text-xs font-black uppercase tracking-widest">Dato</th>
                    <th className="text-xs font-black uppercase tracking-widest">Bruger</th>
                    <th className="text-xs font-black uppercase tracking-widest">Klasse</th>
                    <th className="text-xs font-black uppercase tracking-widest">Kanal</th>
                    <th className="text-xs font-black uppercase tracking-widest">Besked</th>
                    <th className="text-xs font-black uppercase tracking-widest">Alvorlighed</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingArchive ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <span className="loading loading-spinner loading-sm"></span>
                      </td>
                    </tr>
                  ) : filteredArchiveMessages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-base-content/60">
                        Ingen arkiverede beskeder
                      </td>
                    </tr>
                  ) : (
                    paginatedMessages.map((item) => {
                      const msgClass = allClasses.find(c => c.id === item.class_id);
                      return (
                        <tr key={item.event_id} className="hover:bg-base-200">
                          <td className="text-xs">
                            {format(new Date(item.message.created_at), 'dd/MM/yyyy HH:mm', { locale: da })}
                          </td>
                          <td className="text-xs font-bold">{item.message.author?.display_name || 'Ukendt'}</td>
                          <td className="text-xs">
                            {msgClass ? (
                              <div>
                                <div className="font-mono">{msgClass.nickname || msgClass.label}</div>
                                {msgClass.school_name && (
                                  <div className="text-base-content/50 text-[10px]">{msgClass.school_name}</div>
                                )}
                              </div>
                            ) : 'N/A'}
                          </td>
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-6 border-t-2 border-base-content/10 flex justify-center">
                <div className="join">
                  <button 
                    className="join-item btn btn-sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    «
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = page === 1 || 
                                   page === totalPages || 
                                   (page >= currentPage - 2 && page <= currentPage + 2);
                    
                    // Show ellipsis
                    if (!showPage) {
                      if (page === currentPage - 3 || page === currentPage + 3) {
                        return (
                          <button key={page} className="join-item btn btn-sm btn-disabled">
                            ...
                          </button>
                        );
                      }
                      return null;
                    }
                    
                    return (
                      <button
                        key={page}
                        className={`join-item btn btn-sm ${
                          currentPage === page ? 'btn-active' : ''
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button 
                    className="join-item btn btn-sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
