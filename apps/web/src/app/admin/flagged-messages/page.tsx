'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserClasses } from '@/hooks/useUserClasses';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Flag, Check, X, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
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
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'active' | 'archive'>('active');
  const [severity, setSeverity] = useState<'all' | 'high_severity' | 'moderate_severity'>('all');
  const [confirmedCount, setConfirmedCount] = useState<number>(0);
  
  // Filter states
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Data for filters
  const [allClasses, setAllClasses] = useState<ClassInfo[]>([]);
  const [allSchools, setAllSchools] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ user_id: string; display_name: string }>>([]);

  // Permission check: must be admin or class admin for the class
  const isAdmin = profile?.role === 'admin';
  const isTeacher = profile?.role === 'adult';
  const canAccess = isAdmin || (isClassAdmin && !!classId) || (isTeacher && !!classId);

  // Action handlers
  const handleMarkAsViolation = async (eventId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) return;

      const res = await fetch(`/api/moderation/flagged-messages/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      if (res.ok) {
        setFlaggedMessages(prev => prev.filter(m => m.event_id !== eventId));
        setConfirmedCount(prev => prev + 1);
      } else {
        const errorData = await res.json();
        console.error('Failed to mark as violation:', res.status, errorData);
      }
    } catch (err) {
      console.error('Error marking as violation:', err);
    }
  };

  const handleRemoveFlag = async (eventId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) return;

      const res = await fetch(`/api/moderation/flagged-messages/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: 'dismissed' }),
      });

      if (res.ok) {
        setFlaggedMessages(prev => prev.filter(m => m.event_id !== eventId));
      } else {
        const errorData = await res.json();
        console.error('Failed to remove flag:', res.status, errorData);
      }
    } catch (err) {
      console.error('Error removing flag:', err);
    }
  };

  // Fetch all classes for admin filter
  useEffect(() => {
    async function fetchAllClasses() {
      if (!isAdmin) return;
      
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, label, nickname, school_name')
          .order('label');
        
        if (!error && data) {
          setAllClasses(data);
          
          // Extract unique schools
          const schools = [...new Set(data.map(c => c.school_name).filter(Boolean))] as string[];
          setAllSchools(schools);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    }
    
    fetchAllClasses();
  }, [isAdmin]);

  // Fetch confirmed count
  useEffect(() => {
    async function fetchConfirmedCount() {
      if (!canAccess) return;
      
      try {
        const query = supabase
          .from('moderation_events')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'confirmed');
        
        if (classId) {
          query.eq('class_id', classId);
        }
        
        const { count } = await query;
        setConfirmedCount(count || 0);
      } catch (err) {
        console.error('Error fetching confirmed count:', err);
      }
    }
    
    fetchConfirmedCount();
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
          
          // Fetch class info for all unique class_ids in archived messages
          const uniqueClassIds = [...new Set(data.flagged_messages.map((m: ModerationEventWithContext) => m.class_id))];
          if (uniqueClassIds.length > 0) {
            const { data: classesData, error: classesError } = await supabase
              .from('classes')
              .select('id, label, nickname, school_name')
              .in('id', uniqueClassIds);
            
            if (!classesError && classesData) {
              // Merge with existing classes (avoid duplicates)
              setAllClasses(prev => {
                const merged = [...prev];
                classesData.forEach(newClass => {
                  if (!merged.find(c => c.id === newClass.id)) {
                    merged.push(newClass);
                  }
                });
                return merged;
              });
            }
          }
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
  }, [canAccess, classId, isClassAdmin, severity, user, profileLoading, hasAnyClassAdmin, isTeacher, view]);

  // Show loading while profile is loading OR while fetching messages
  if (loading || profileLoading) {
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

  // Only show error after profile has loaded
  if (error && !profileLoading) {
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
                  Arkiverede beskeder
                </span>
                <span className={`badge badge-xs font-bold ${
                  view === 'archive' ? 'badge-secondary' : 'badge-ghost'
                }`}>
                  {confirmedCount}
                </span>
              </div>
            </button>
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
                  : `${filteredArchiveMessages.length} arkiverede besked${filteredArchiveMessages.length !== 1 ? 'er' : ''}`
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
                <CheckCircle className="w-16 h-16 stroke-current text-success mx-auto" strokeWidth={2} />
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
                  <button 
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleRemoveFlag(msg.event_id)}
                  >
                    <Check size={16} />
                    Godkend
                  </button>
                  <button 
                    className="btn btn-sm btn-ghost text-error"
                    onClick={() => handleMarkAsViolation(msg.event_id)}
                  >
                    <X size={16} />
                    Markér krænkelse
                  </button>
                </div>
              </div>
            ))}
          </div>
            )}
          </>
        )}

        {/* Archive View */}
        {view === 'archive' && (
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
                    filteredArchiveMessages.map((item) => {
                      const msgClass = allClasses.find(c => c.id === item.class_id);
                      return (
                        <tr key={item.event_id} className="hover:bg-base-200">
                          <td className="text-xs">
                            {format(new Date(item.message.created_at), 'dd/MM/yyyy HH:mm', { locale: da })}
                          </td>
                          <td className="text-xs font-bold">{item.message.author?.display_name || 'Ukendt'}</td>
                          <td className="text-xs font-mono">
                            {msgClass ? (msgClass.nickname || msgClass.label) : 'N/A'}
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
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
