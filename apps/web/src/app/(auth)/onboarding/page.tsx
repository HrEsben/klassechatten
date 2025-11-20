'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type OnboardingStep = 'choice' | 'create' | 'join' | 'claim-child' | 'success';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('choice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdClass, setCreatedClass] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [claimedChild, setClaimedChild] = useState<any>(null);

  // Create class form state
  const [schoolName, setSchoolName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('0');
  const [classLetter, setClassLetter] = useState('A');
  const [studentCount, setStudentCount] = useState('20');

  // Join class form state
  const [inviteCode, setInviteCode] = useState('');
  
  // Claim child form state
  const [guardianInviteCode, setGuardianInviteCode] = useState('');

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get current session to pass to API
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Du skal være logget ind for at oprette en klasse');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/classes/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          schoolName,
          gradeLevel: parseInt(gradeLevel),
          classLetter,
          studentCount: parseInt(studentCount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create class');
      }

      // Success! Show invite code before redirecting
      setCreatedClass(data.class);
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get current session to pass to API
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Du skal være logget ind for at tilmelde dig en klasse');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join class');
      }

      // Success! Redirect to dashboard
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Du skal være logget ind for at tilknytte barn');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/guardians/claim-invite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inviteCode: guardianInviteCode.toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim child');
      }

      setClaimedChild(data);
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (createdClass?.invite_code) {
      try {
        await navigator.clipboard.writeText(createdClass.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-ball loading-lg text-primary"></span>
          <p className="text-base-content/60 font-medium">Indlæser...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center p-4">
        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4 max-w-md">
          <svg className="w-16 h-16 stroke-current text-warning mx-auto" strokeWidth={2} fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
            Ikke Logget Ind
          </h2>
          <p className="text-base-content/60">
            Du skal være logget ind for at fortsætte med onboarding.
          </p>
          <button 
            onClick={() => router.push('/login')}
            className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
          >
            Gå til Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content mb-2">
            Velkommen til KlasseChatten
          </h1>
          <div className="h-1 w-24 bg-primary mx-auto mb-4"></div>
          <p className="text-sm text-base-content/60">
            Lad os komme i gang med at oprette din klasse
          </p>
        </div>

        {/* Choice Step */}
        {step === 'choice' && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Create Class Card */}
            <button
              onClick={() => setStep('create')}
              className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
            >
              <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
              
              <div className="px-8 py-6 pl-10">
                <div className="flex items-start justify-between mb-3">
                  <svg className="w-8 h-8 stroke-current text-primary" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M12 4v16m8-8H4"/>
                  </svg>
                </div>
                
                <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                  Opret Klasse
                </h3>
                
                <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                  Opret en ny klasse og inviter elever
                </p>
              </div>
            </button>

            {/* Join Class Card */}
            <button
              onClick={() => setStep('join')}
              className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-warning transition-all duration-200 overflow-hidden"
            >
              <div className="absolute left-0 top-0 w-1 h-full bg-warning/30 group-hover:bg-warning group-hover:w-2 transition-all duration-200"></div>
              
              <div className="px-8 py-6 pl-10">
                <div className="flex items-start justify-between mb-3">
                  <svg className="w-8 h-8 stroke-current text-warning" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
                  </svg>
                </div>
                
                <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                  Brug Invitation
                </h3>
                
                <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                  Brug en invitationskode til at tilmelde dig
                </p>
              </div>
            </button>

            {/* Claim Child Card */}
            <button
              onClick={() => setStep('claim-child')}
              className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-accent transition-all duration-200 overflow-hidden"
            >
              <div className="absolute left-0 top-0 w-1 h-full bg-accent/30 group-hover:bg-accent group-hover:w-2 transition-all duration-200"></div>
              
              <div className="px-8 py-6 pl-10">
                <div className="flex items-start justify-between mb-3">
                  <svg className="w-8 h-8 stroke-current text-accent" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                
                <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                  Forældre-Kode
                </h3>
                
                <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                  Har du modtaget en forældre-kode?
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Create Class Form */}
        {step === 'create' && (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            {/* Header */}
            <div className="p-6 border-b-2 border-base-content/10">
              <button
                onClick={() => setStep('choice')}
                className="btn btn-ghost btn-sm mb-2"
              >
                ← Tilbage
              </button>
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                Opret Ny Klasse
              </h2>
              <div className="h-1 w-24 bg-primary mt-2"></div>
            </div>

            <form onSubmit={handleCreateClass} className="p-6 space-y-6">
              {error && (
                <div className="alert alert-error">
                  <svg className="w-6 h-6 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  <span className="text-xs font-mono uppercase tracking-wider">{error}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Grade + Letter inline with equal width */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Klassetrin dropdown */}
                  <div className="dropdown w-full">
                    <div tabIndex={0} role="button" className="btn btn-outline btn-primary w-full justify-between font-black">
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {gradeLevel}. KLASSE
                      </span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="square" strokeLinejoin="miter" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </div>
                    <ul tabIndex={-1} className="dropdown-content menu bg-base-100 border-2 border-primary z-10 w-full p-2 shadow-lg">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(grade => (
                        <li key={grade}>
                          <button
                            type="button"
                            onClick={(e) => {
                              setGradeLevel(grade.toString());
                              (document.activeElement as HTMLElement)?.blur();
                            }}
                            className="font-bold uppercase"
                          >
                            {grade}. klasse
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Letter input */}
                  <label className="input input-secondary w-full">
                    <span className="label text-xs font-bold uppercase tracking-widest">Bogstav</span>
                    <input
                      type="text"
                      placeholder="A, X, RØD..."
                      value={classLetter}
                      onChange={(e) => setClassLetter(e.target.value.toUpperCase())}
                      maxLength={20}
                      className="font-bold"
                      required
                    />
                  </label>
                </div>

                {/* School name - full width */}
                <label className="input input-accent w-full">
                  <span className="label text-xs font-bold uppercase tracking-widest">Skole</span>
                  <input
                    type="text"
                    placeholder="F.eks. Vadgård Skole"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="font-bold"
                    required
                  />
                </label>

                {/* Student count - full width */}
                <label className="input input-info w-full">
                  <span className="label text-xs font-bold uppercase tracking-widest">Antal Elever</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={studentCount}
                    onChange={(e) => setStudentCount(e.target.value)}
                    className="font-bold"
                    required
                  />
                </label>
              </div>

              {/* Live Preview - clean, no box */}
              {(gradeLevel || classLetter || schoolName || studentCount) && (
                <div className="text-center py-6">
                  <p className="text-3xl font-black uppercase tracking-tight text-base-content mb-1">
                    {gradeLevel}.{classLetter || '?'} på {schoolName || 'Skolen'}
                  </p>
                  {studentCount && (
                    <p className="text-xs font-mono uppercase tracking-wider text-base-content/50 mt-2">
                      {studentCount} elever
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setStep('choice')}
                  className="btn btn-ghost"
                  disabled={loading}
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    'Opret Klasse'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Join Class Form */}
        {step === 'join' && (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6 border-b-2 border-base-content/10">
              <button
                onClick={() => setStep('choice')}
                className="btn btn-ghost btn-sm mb-2"
              >
                ← Tilbage
              </button>
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                Tilmeld Klasse
              </h2>
            </div>

            <form onSubmit={handleJoinClass} className="p-6 space-y-4">
              {error && (
                <div className="alert alert-error alert-outline">
                  <span className="text-xs font-mono uppercase tracking-wider">{error}</span>
                </div>
              )}

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Invitationskode</legend>
                
                <label className="input">
                  <span className="label">Kode</span>
                  <input
                    type="text"
                    placeholder="F.eks. ABC123XY"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    required
                    className="font-mono uppercase"
                  />
                </label>
                <p className="label text-xs">
                  Indtast den 8-cifrede kode du har modtaget fra klasselæreren
                </p>
              </fieldset>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setStep('choice')}
                  className="btn btn-ghost"
                  disabled={loading}
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    'Tilmeld'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Claim Child Form */}
        {step === 'claim-child' && (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6 border-b-2 border-base-content/10">
              <button
                onClick={() => setStep('choice')}
                className="btn btn-ghost btn-sm mb-2"
              >
                ← Tilbage
              </button>
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                Tilknyt Barn
              </h2>
              <div className="h-1 w-24 bg-accent mt-2"></div>
            </div>

            <form onSubmit={handleClaimChild} className="p-6 space-y-4">
              {error && (
                <div className="alert alert-error alert-outline">
                  <svg className="w-6 h-6 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  <span className="text-xs font-mono uppercase tracking-wider">{error}</span>
                </div>
              )}

              <div className="bg-accent/10 border-2 border-accent/30 p-6">
                <h3 className="text-sm font-black uppercase tracking-tight text-base-content mb-2">
                  Anden Forælder
                </h3>
                <p className="text-xs text-base-content/70">
                  Hvis du har modtaget en forældre-kode fra den anden forælder, skal du indtaste den her. 
                  Det vil give dig adgang til barnets data og klassens chats.
                </p>
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Forældre-Kode</legend>
                
                <label className="input">
                  <span className="label">Kode</span>
                  <input
                    type="text"
                    placeholder="F.eks. ABC12XYZ"
                    value={guardianInviteCode}
                    onChange={(e) => setGuardianInviteCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    required
                    className="font-mono uppercase"
                  />
                </label>
                <p className="label text-xs">
                  Indtast den 8-cifrede forældre-kode du har modtaget
                </p>
              </fieldset>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setStep('choice')}
                  className="btn btn-ghost"
                  disabled={loading}
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  className="btn bg-accent text-accent-content hover:bg-accent/80"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    'Tilknyt Barn'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Success Step - Child Claimed */}
        {step === 'success' && claimedChild && (
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
                  Du har nu adgang til <strong className="text-accent">{claimedChild.child_name}</strong>
                  {claimedChild.classes_joined > 0 && (
                    <span> og er tilmeldt {claimedChild.classes_joined} {claimedChild.classes_joined === 1 ? 'klasse' : 'klasser'}</span>
                  )}
                </p>
              </div>

              <div className="text-center">
                <button
                  onClick={() => router.push('/')}
                  className="btn bg-accent text-accent-content hover:bg-accent/80"
                >
                  Gå til Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Step - Show Invite Code */}
        {step === 'success' && createdClass && (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6 border-b-2 border-base-content/10">
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                Klasse Oprettet
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-accent/10 border-2 border-accent p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-base-content/60 mb-2 text-center">
                  Invitationskode
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-5xl font-black tracking-wider text-accent font-mono">
                    {createdClass.invite_code}
                  </code>
                  <div className={`tooltip ${copied ? 'tooltip-open tooltip-success' : ''}`} data-tip={copied ? 'Kopieret!' : 'Kopier kode'}>
                    <button
                      onClick={handleCopyInviteCode}
                      className="btn btn-ghost btn-square btn-sm"
                    >
                      <svg className="w-5 h-5 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="square" strokeLinejoin="miter" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-base-content/60 text-center mt-4">
                  Del denne kode med klassens forældre, så de kan oprette en bruger i klassen
                </p>
              </div>

              <div className="bg-info/10 border-l-2 border-info p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-base-content mb-2">
                  Næste Skridt
                </p>
                <ol className="text-xs text-base-content/70 space-y-2">
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <span>Del invitationskoden med de andre forældre i klassen</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">2.</span>
                    <span>Hver forælder skal tilmelde sig med koden via "Tilmeld Dig Klasse"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">3.</span>
                    <span>Gå til <strong>"Opret Barn Konto"</strong> i dashboardet for at oprette konti til jeres børn</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">4.</span>
                    <span>Børnene kan derefter logge ind med deres brugernavn og adgangskode</span>
                  </li>
                </ol>
              </div>

              <button
                onClick={() => router.push('/')}
                className="btn w-full bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
              >
                Gå Til Dashboard
              </button>
            </div>
          </div>
        )}
    </>
  );
}
