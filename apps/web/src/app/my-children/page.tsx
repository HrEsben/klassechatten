'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { ArrowLeft, Users, UserPlus } from 'lucide-react';

interface Child {
  child_id: string;
  child_name: string;
  child_username: string;
  guardian_count: number;
}

export default function MyChildrenPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadChildren();
  }, [user]);

  const loadChildren = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/guardians/my-children');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load children');
      }

      setChildren(data.children);
    } catch (err: any) {
      console.error('Error loading children:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-ball loading-lg text-primary"></span>
          <p className="text-base-content/60 font-medium">Indlæser...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-300 p-4">
      <div className="w-full max-w-7xl mx-auto px-12 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="btn btn-ghost btn-sm mb-4">
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            Tilbage
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content mb-2">
            Mine Børn
          </h1>
          <div className="h-1 w-24 bg-primary mb-4"></div>
          <p className="text-sm text-base-content/60">
            Administrer dine børns konti og inviter anden forælder
          </p>
        </div>

        {error && (
          <div className="alert alert-error alert-outline mb-6">
            <svg className="w-6 h-6 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span className="text-xs font-mono uppercase tracking-wider">{error}</span>
          </div>
        )}

        {children.length === 0 ? (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center">
            <svg className="w-16 h-16 stroke-current text-secondary mx-auto mb-4" strokeWidth={2} fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h2 className="text-2xl font-black uppercase tracking-tight text-base-content mb-2">
              Ingen Børn
            </h2>
            <p className="text-base-content/60 mb-6">
              Du har ikke oprettet nogen børn endnu
            </p>
            <button
              onClick={() => router.push('/create-child')}
              className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
            >
              Opret Barn Konto
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child) => (
              <div
                key={child.child_id}
                className="bg-base-100 border-2 border-base-content/10 shadow-lg"
              >
                <div className="p-6 border-b-2 border-base-content/10">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-black uppercase tracking-tight text-base-content">
                        {child.child_name}
                      </h3>
                      <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                        Brugernavn: {child.child_username}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="badge badge-neutral badge-sm font-bold uppercase">
                        {child.guardian_count} {child.guardian_count === 1 ? 'Forælder' : 'Forældre'}
                      </div>
                      <button
                        onClick={() => router.push(`/child/${child.child_id}`)}
                        className="btn btn-sm btn-ghost"
                      >
                        <svg className="w-5 h-5 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5l7 7-7 7"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {child.guardian_count < 2 ? (
                    <div className="bg-info/10 border-2 border-info/30 p-6 text-center">
                      <Users className="w-12 h-12 stroke-current text-info mx-auto mb-3" strokeWidth={2} />
                      <p className="text-sm font-black uppercase tracking-tight text-base-content mb-2">
                        Inviter Anden Forælder
                      </p>
                      <p className="text-xs text-base-content/60 mb-4">
                        Klik på barnets profil for at sende email-invitation
                      </p>
                      <button
                        onClick={() => router.push(`/child/${child.child_id}`)}
                        className="btn btn-sm bg-info text-info-content hover:bg-info/80"
                      >
                        Se Profil
                      </button>
                    </div>
                  ) : (
                    <div className="bg-success/10 border-2 border-success/30 p-6 text-center">
                      <svg className="w-12 h-12 stroke-current text-success mx-auto mb-3" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm font-black uppercase tracking-tight text-base-content">
                        Begge Forældre Tilknyttet
                      </p>
                      <p className="text-xs text-base-content/60 mt-1">
                        Maksimalt antal forældre er nået
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Child Button */}
        {children.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/create-child')}
              className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
            >
              <UserPlus className="w-5 h-5" strokeWidth={2} />
              Opret Nyt Barn
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
