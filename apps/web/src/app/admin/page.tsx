"use client";
import Link from 'next/link';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserClasses } from '@/hooks/useUserClasses';
import { School, Users, MessageSquare, TriangleAlert, TrendingUp, Activity, Hash, LayoutList } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  totalClasses: number;
  totalUsers: number;
  totalRooms: number;
  totalMessages: number;
  messages24h: number;
  activeFlags: number;
  avgMessageSendMs: number | null;
}

interface ClassStats {
  memberCount: number;
  roomCount: number;
  messageCount: number;
  flaggedCount: number;
}

function ClassStatsCard({ classData }: { classData: any }) {
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClassStats();
  }, [classData.id]);

  const fetchClassStats = async () => {
    try {
      const [members, rooms, messages, flagged] = await Promise.all([
        supabase
          .from('class_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('class_id', classData.id),
        supabase
          .from('rooms')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', classData.id),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', classData.id),
        supabase
          .from('moderation_events')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', classData.id)
          .in('status', ['flagged', 'hidden'])
          .is('reviewed_at', null)
      ]);

      setStats({
        memberCount: members.count || 0,
        roomCount: rooms.count || 0,
        messageCount: messages.count || 0,
        flaggedCount: flagged.count || 0
      });
    } catch (err) {
      console.error('Failed to fetch class stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
          {classData.nickname || classData.label}
        </h2>
        <p className="text-xs font-mono uppercase tracking-wider text-base-content/50 mt-1">
          {classData.school_name} • {classData.grade_level}. klasse
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-ball loading-md text-primary"></span>
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <Users className="w-6 h-6 stroke-current text-primary" strokeWidth={2} />
                <span className="text-xl font-black text-base-content">{stats.memberCount}</span>
              </div>
              <h3 className="text-xs font-black uppercase tracking-tight text-base-content">
                Medlemmer
              </h3>
            </div>
          </div>

          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <Hash className="w-6 h-6 stroke-current text-accent" strokeWidth={2} />
                <span className="text-xl font-black text-base-content">{stats.roomCount}</span>
              </div>
              <h3 className="text-xs font-black uppercase tracking-tight text-base-content">
                Kanaler
              </h3>
            </div>
          </div>

          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <MessageSquare className="w-6 h-6 stroke-current text-info" strokeWidth={2} />
                <span className="text-xl font-black text-base-content">{stats.messageCount.toLocaleString()}</span>
              </div>
              <h3 className="text-xs font-black uppercase tracking-tight text-base-content">
                Beskeder
              </h3>
            </div>
          </div>

          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <TriangleAlert className="w-6 h-6 stroke-current text-warning" strokeWidth={2} />
                <span className="text-xl font-black text-base-content">{stats.flaggedCount}</span>
              </div>
              <h3 className="text-xs font-black uppercase tracking-tight text-base-content">
                Aktive Flag
              </h3>
              {stats.flaggedCount > 0 && (
                <Link 
                  href={`/admin/flagged-messages?class_id=${classData.id}`} 
                  className="btn btn-xs btn-warning mt-3"
                >
                  Se Flag
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminHomePage() {
  const { profile, loading: profileLoading } = useUserProfile();
  const { classes, loading: classesLoading } = useUserClasses();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  const isGlobalAdmin = profile?.role === 'admin';
  const adminClasses = classes.filter(c => c.is_class_admin);

  useEffect(() => {
    if (profileLoading) return;
    
    if (isGlobalAdmin) {
      fetchDashboardStats();
    } else {
      setStatsLoading(false);
    }
  }, [isGlobalAdmin, profileLoading]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch aggregate stats
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      
      if (error) {
        // Fallback to manual queries if RPC doesn't exist
        const [classes, users, rooms, messages, messages24h, flags, perf] = await Promise.all([
          supabase.from('classes').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('user_id', { count: 'exact', head: true }).or('is_placeholder.is.null,is_placeholder.eq.false'),
          supabase.from('rooms').select('id', { count: 'exact', head: true }),
          supabase.from('messages').select('id', { count: 'exact', head: true }),
          supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
          supabase
            .from('moderation_events')
            .select('id', { count: 'exact', head: true })
            .in('status', ['flagged', 'hidden'])
            .is('reviewed_at', null),
          supabase
            .from('performance_metrics')
            .select('duration')
            .eq('type', 'message_send')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        ]);

        const avgDuration = perf.data && perf.data.length > 0
          ? Math.round(perf.data.reduce((sum, m) => sum + m.duration, 0) / perf.data.length)
          : null;

        setStats({
          totalClasses: classes.count || 0,
          totalUsers: users.count || 0,
          totalRooms: rooms.count || 0,
          totalMessages: messages.count || 0,
          messages24h: messages24h.count || 0,
          activeFlags: flags.count || 0,
          avgMessageSendMs: avgDuration
        });
      } else {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Show loading state while hooks are initializing
  if (profileLoading || classesLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-12 py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-ball loading-lg text-primary"></span>
            <p className="text-base-content/60 font-medium">Indlæser...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-12 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content">
            {isGlobalAdmin ? 'Dashboard' : 'Mine Klasser'}
          </h1>
          <div className="h-1 w-24 bg-primary mt-2"></div>
          <p className="text-sm text-base-content/60 mt-3">
            {isGlobalAdmin 
              ? 'System oversigt og nøgletal.'
              : 'Administrer dine klasser og se flaggede beskeder.'}
          </p>
        </div>

        {/* Global Admin View */}
        {isGlobalAdmin && (
          <>
            {statsLoading ? (
              <div className="flex justify-center items-center py-12">
                <span className="loading loading-ball loading-lg text-primary"></span>
              </div>
            ) : stats ? (
              <div className="space-y-8">
                {/* System Statistics */}
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-base-content mb-4">
                    System Statistik
                  </h2>
                  <div className="stats stats-vertical lg:stats-horizontal shadow-lg w-full bg-base-100 border-2 border-base-content/10">
                    <div className="stat">
                      <div className="stat-figure text-primary">
                        <School className="w-8 h-8 stroke-current" strokeWidth={2} />
                      </div>
                      <div className="stat-title text-xs font-bold uppercase tracking-widest">Klasser</div>
                      <div className="stat-value text-primary">{stats.totalClasses}</div>
                    </div>

                    <div className="stat">
                      <div className="stat-figure text-secondary">
                        <Users className="w-8 h-8 stroke-current" strokeWidth={2} />
                      </div>
                      <div className="stat-title text-xs font-bold uppercase tracking-widest">Brugere</div>
                      <div className="stat-value text-secondary">{stats.totalUsers}</div>
                    </div>

                    <div className="stat">
                      <div className="stat-figure text-accent">
                        <MessageSquare className="w-8 h-8 stroke-current" strokeWidth={2} />
                      </div>
                      <div className="stat-title text-xs font-bold uppercase tracking-widest">Kanaler</div>
                      <div className="stat-value text-accent">{stats.totalRooms}</div>
                    </div>
                  </div>
                </div>

                {/* Activity & Moderation */}
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-base-content mb-4">
                    Aktivitet & Moderation
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <MessageSquare className="w-8 h-8 stroke-current text-info" strokeWidth={2} />
                          <span className="text-2xl font-black text-base-content">{stats.totalMessages.toLocaleString()}</span>
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">
                          Beskeder i alt
                        </h3>
                      </div>
                    </div>

                    <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <TrendingUp className="w-8 h-8 stroke-current text-success" strokeWidth={2} />
                          <span className="text-2xl font-black text-base-content">{stats.messages24h.toLocaleString()}</span>
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">
                          Seneste døgn
                        </h3>
                      </div>
                    </div>

                    <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <TriangleAlert className="w-8 h-8 stroke-current text-warning" strokeWidth={2} />
                          <span className="text-2xl font-black text-base-content">{stats.activeFlags}</span>
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content mb-1">
                          Aktive Flag
                        </h3>
                        <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                          Venter på review
                        </p>
                        {stats.activeFlags > 0 && (
                          <Link href="/admin/flagged-messages" className="btn btn-sm btn-warning mt-4">
                            Se Flaggede Beskeder
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                {stats.avgMessageSendMs !== null && (
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-base-content mb-4">
                      Performance
                    </h2>
                    <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <Activity className="w-8 h-8 stroke-current text-info" strokeWidth={2} />
                          <span className="text-2xl font-black text-base-content">{stats.avgMessageSendMs}ms</span>
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content mb-1">
                          Gennemsnitlig Afsendelsestid
                        </h3>
                        <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                          Sidste 24 timer
                        </p>
                        <Link href="/admin/performance" className="btn btn-sm btn-ghost mt-4">
                          Se Detaljeret Performance
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}

        {/* Class Admin View */}
        {!isGlobalAdmin && adminClasses.length > 0 && (
          <div className="space-y-8">
            {adminClasses.map((cls) => (
              <ClassStatsCard key={cls.id} classData={cls} />
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
  );
}
