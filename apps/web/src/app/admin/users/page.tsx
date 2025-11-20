'use client';

import { useRouter } from 'next/navigation';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';

function AdminUsersContent() {
  const router = useRouter();
  const { users, stats, loading, error, getRoleLabel, getRoleBadgeColor } = useAdminUsers();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-ball loading-lg text-primary"></span>
          <p className="text-base-content/60 font-medium">Indlæser brugere...</p>
        </div>
      </div>
    );
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
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Fejl ved indlæsning af data: {error}</span>
        </div>
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

      {/* Users Table */}
      <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
        {/* Table Header */}
        <div className="p-6 border-b-2 border-base-content/10">
          <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
            Alle Brugere
          </h2>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr className="border-b-2 border-base-content/10">
                <th className="text-xs font-black uppercase tracking-widest">Bruger</th>
                <th className="text-xs font-black uppercase tracking-widest">Email</th>
                <th className="text-xs font-black uppercase tracking-widest">Rolle</th>
                <th className="text-xs font-black uppercase tracking-widest">Oprettet</th>
                <th className="text-xs font-black uppercase tracking-widest">Sidst aktiv</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id} className="hover:bg-base-200">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div 
                          className="w-10 h-10 rounded-none text-base-100 font-bold"
                          style={{ backgroundColor: user.avatar_color || '#6247f5' }}
                        >
                          <span className="text-sm">
                            {user.display_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-sm">{user.display_name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-base-content/70">
                      {user.email}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getRoleBadgeColor(user.role)} badge-sm font-bold uppercase`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-base-content/60">
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: da })}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-base-content/60">
                      {user.last_sign_in_at 
                        ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true, locale: da })
                        : 'Aldrig'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return <AdminUsersContent />;
}
