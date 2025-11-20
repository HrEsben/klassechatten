'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserPlus, TriangleAlert, ChevronRight, Check } from 'lucide-react';
import { LoadingSpinner, EmptyState } from '@/components/shared';
import AppLayout from '@/components/AppLayout';

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
    return <LoadingSpinner fullScreen />;
  }

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto px-12 py-8">

        {error && (
          <div className="alert alert-error alert-outline mb-6">
            <TriangleAlert className="w-6 h-6 stroke-current" strokeWidth={2} />
            <span className="text-xs font-mono uppercase tracking-wider">{error}</span>
          </div>
        )}

        {children.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Ingen Børn"
            description="Du har ikke oprettet nogen børn endnu"
            iconColor="text-secondary"
            action={{
              label: "Opret Barn Konto",
              onClick: () => router.push('/create-child')
            }}
          />
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
                        <ChevronRight className="w-5 h-5 stroke-current" strokeWidth={2} />
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
                      <Check className="w-12 h-12 stroke-current text-success mx-auto mb-3" strokeWidth={2} />
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
    </AppLayout>
  );
}
