'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/AdminLayout';

interface Child {
  child_id: string;
  child_name: string;
  child_username: string;
  invite_code: string | null;
  code_generated_at: string | null;
  code_used: boolean;
  code_used_at: string | null;
  guardian_count: number;
}

export default function MyChildrenPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [error, setError] = useState('');
  const [generatingCodeFor, setGeneratingCodeFor] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const handleGenerateCode = async (childId: string) => {
    setGeneratingCodeFor(childId);
    setError('');

    try {
      const response = await fetch('/api/guardians/generate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate invite code');
      }

      // Reload children to show new code
      await loadChildren();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingCodeFor(null);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-ball loading-lg text-primary"></span>
            <p className="text-base-content/60 font-medium">Indlæser...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="w-full max-w-7xl mx-auto px-12 py-8">
        {/* Header */}
        <div className="mb-8">
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
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-base-content">
                        {child.child_name}
                      </h3>
                      <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                        Brugernavn: {child.child_username}
                      </p>
                    </div>
                    <div className="badge badge-neutral badge-sm font-bold uppercase">
                      {child.guardian_count} {child.guardian_count === 1 ? 'Forælder' : 'Forældre'}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Guardian Invite Section */}
                  {child.guardian_count < 2 ? (
                    <div className="bg-accent/10 border-2 border-accent/30 p-6 space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-tight text-base-content">
                        Inviter Anden Forælder
                      </h4>
                      
                      {!child.invite_code || child.code_used ? (
                        <div className="space-y-3">
                          <p className="text-xs text-base-content/70">
                            Generer en invitation til den anden forælder
                          </p>
                          <button
                            onClick={() => handleGenerateCode(child.child_id)}
                            className="btn bg-accent text-accent-content hover:bg-accent/80 btn-sm"
                            disabled={generatingCodeFor === child.child_id}
                          >
                            {generatingCodeFor === child.child_id ? (
                              <>
                                <span className="loading loading-spinner loading-xs"></span>
                                Genererer...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                                  <path strokeLinecap="square" strokeLinejoin="miter" d="M12 4v16m8-8H4"/>
                                </svg>
                                Generer Kode
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-base-100 border-2 border-accent p-4 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-1">
                                Forældre-Kode
                              </p>
                              <p className="text-xl font-black font-mono tracking-wider text-accent">
                                {child.invite_code}
                              </p>
                              <p className="text-xs text-base-content/50 mt-1">
                                Genereret {new Date(child.code_generated_at!).toLocaleDateString('da-DK')}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCopyCode(child.invite_code!)}
                              className="btn btn-square btn-ghost"
                              title="Kopier kode"
                            >
                              {copiedCode === child.invite_code ? (
                                <svg className="w-6 h-6 stroke-current text-success" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                                  <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-6 h-6 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                                  <path strokeLinecap="square" strokeLinejoin="miter" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                              )}
                            </button>
                          </div>
                          <div className="bg-warning/10 border-2 border-warning/30 p-3">
                            <p className="text-xs text-base-content/70">
                              <strong className="text-warning font-bold">Husk:</strong> Del kun denne kode med den anden forælder. Koden kan kun bruges én gang.
                            </p>
                          </div>
                        </div>
                      )}
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
              <svg className="w-5 h-5 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" d="M12 4v16m8-8H4"/>
              </svg>
              Opret Nyt Barn
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
