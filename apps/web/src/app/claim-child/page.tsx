'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ClaimChildPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [guardianInviteCode, setGuardianInviteCode] = useState('');

  const handleClaimChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user) {
        setError('Du skal være logget ind');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/guardians/claim-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: guardianInviteCode.toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim child');
      }

      setSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth
  if (!user) {
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
    <div className="min-h-screen bg-base-300 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="btn btn-ghost btn-sm mb-4"
          >
            ← Tilbage til Dashboard
          </button>
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content mb-2">
            Tilknyt Barn
          </h1>
          <div className="h-1 w-24 bg-accent mx-auto mb-4"></div>
          <p className="text-sm text-base-content/60">
            Brug en forældre-kode til at få adgang til dit barns data
          </p>
        </div>

        {success ? (
          /* Success State */
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6 border-b-2 border-base-content/10">
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                Barn Tilknyttet
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-accent/10 border-2 border-accent p-6 text-center">
                <svg className="w-16 h-16 stroke-current text-accent mx-auto mb-4" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                </svg>
                <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-2">
                  Succes!
                </h3>
                <p className="text-sm text-base-content/70">
                  Du har nu adgang til <strong className="text-accent">{success.child_name}</strong>
                  {success.classes_joined > 0 && (
                    <span> og er tilmeldt {success.classes_joined} {success.classes_joined === 1 ? 'klasse' : 'klasser'}</span>
                  )}
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => router.push('/')}
                  className="btn bg-accent text-accent-content hover:bg-accent/80"
                >
                  Gå til Dashboard
                </button>
                <button
                  onClick={() => {
                    setSuccess(null);
                    setGuardianInviteCode('');
                    setError('');
                  }}
                  className="btn btn-ghost"
                >
                  Tilknyt Andet Barn
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Claim Form */
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6 border-b-2 border-base-content/10">
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                Indtast Forældre-Kode
              </h2>
              <div className="h-1 w-24 bg-accent mt-2"></div>
            </div>

            <form onSubmit={handleClaimChild} className="p-6 space-y-6">
              {error && (
                <div className="alert alert-error alert-outline">
                  <svg className="w-6 h-6 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  <span className="text-xs font-mono uppercase tracking-wider">{error}</span>
                </div>
              )}

              <div className="bg-accent/10 border-2 border-accent/30 p-6">
                <h3 className="text-sm font-black uppercase tracking-tight text-base-content mb-3">
                  Anden Forælder?
                </h3>
                <p className="text-xs text-base-content/70 mb-4">
                  Hvis du har modtaget en forældre-kode fra den anden forælder, skal du indtaste den her. 
                  Det vil give dig adgang til barnets data, klasser og chats.
                </p>
                <div className="bg-info/10 border-2 border-info/30 p-4">
                  <p className="text-xs text-base-content/70">
                    <strong className="text-info font-bold">Vigtigt:</strong> Denne kode er forskellig fra klasse-invitationskoden. 
                    Den forældre-kode får du kun fra den anden forælder til jeres fælles barn.
                  </p>
                </div>
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Forældre-Kode</legend>
                
                <label className="input">
                  <span className="label">8-Cifret Kode</span>
                  <input
                    type="text"
                    placeholder="F.eks. ABC12XYZ"
                    value={guardianInviteCode}
                    onChange={(e) => setGuardianInviteCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    required
                    className="font-mono uppercase text-xl tracking-wider text-center"
                    autoFocus
                  />
                </label>
                <p className="label text-xs">
                  Indtast den kode du har modtaget fra den anden forælder
                </p>
              </fieldset>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="btn btn-ghost"
                  disabled={loading}
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  className="btn bg-accent text-accent-content hover:bg-accent/80"
                  disabled={loading || guardianInviteCode.length !== 8}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Tilknytter...
                    </>
                  ) : (
                    'Tilknyt Barn'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 bg-base-100 border-2 border-base-content/10 p-6">
          <h3 className="text-sm font-black uppercase tracking-tight text-base-content mb-3">
            Har du ikke en kode?
          </h3>
          <p className="text-xs text-base-content/70 mb-4">
            Hvis du er den første forælder og vil oprette en konto til dit barn, skal du:
          </p>
          <button
            onClick={() => router.push('/create-child')}
            className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content btn-sm"
          >
            Opret Barn Konto
          </button>
        </div>
      </div>
    </div>
  );
}
