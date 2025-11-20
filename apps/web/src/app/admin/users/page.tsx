'use client';

import { useRouter } from 'next/navigation';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';
import { LoadingSpinner, ErrorState, UserCard } from '@/components/shared';

function AdminUsersContent() {
  const router = useRouter();
  const { users, stats, loading, error, getRoleLabel, getRoleBadgeColor } = useAdminUsers();

  if (loading) {
    return <LoadingSpinner fullHeight text="Indlæser brugere..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-5 h-5 stroke-current" strokeWidth={2}>
            <path strokeLinecap="square" strokeLinejoin="miter" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Tilbage
        </button>
        <ErrorState message={`Fejl ved indlæsning af data: ${error}`} />
      </div>
    );
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
            Brugeradministration
          </h1>
          <div className="h-1 w-24 bg-primary mt-2"></div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats stats-vertical lg:stats-horizontal shadow-lg w-full bg-base-100 border-2 border-base-content/10">
        <div className="stat">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="stat-title">BRUGERE I ALT</div>
          <div className="stat-value text-primary">{stats.totalUsers}</div>
          <div className="stat-desc">Registrerede brugere</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="stat-title">ELEVER</div>
          <div className="stat-value text-info">{stats.students}</div>
          <div className="stat-desc">Børn i systemet</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="stat-title">FORÆLDRE</div>
          <div className="stat-value text-secondary">{stats.parents}</div>
          <div className="stat-desc">Værger tilknyttet</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div className="stat-title">LÆRERE</div>
          <div className="stat-value text-accent">{stats.teachers}</div>
          <div className="stat-desc">Voksne brugere</div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
        {/* Header */}
        <div className="p-6 border-b-2 border-base-content/10">
          <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
            Alle Brugere
          </h2>
        </div>

        {/* User List */}
        <div className="divide-y-2 divide-base-content/10">
          {users.map((user) => (
            <div key={user.user_id} className="p-4 hover:bg-base-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <UserCard
                  user={{
                    display_name: user.display_name,
                    email: user.email,
                    avatar_url: user.avatar_url,
                    avatar_color: user.avatar_color,
                  }}
                  showRole
                  roleLabel={getRoleLabel(user.role)}
                  roleBadgeColor={getRoleBadgeColor(user.role)}
                  className="flex-1"
                />
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-xs text-base-content/60">
                    Oprettet {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: da })}
                  </span>
                  <span className="text-xs text-base-content/60">
                    Sidst aktiv: {user.last_sign_in_at 
                      ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true, locale: da })
                      : 'Aldrig'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return <AdminUsersContent />;
}
