'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type OnboardingStep = 'choice' | 'create' | 'join';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('choice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create class form state
  const [schoolName, setSchoolName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('0');
  const [classLetter, setClassLetter] = useState('A');
  const [nickname, setNickname] = useState('');
  const [studentCount, setStudentCount] = useState('20');

  // Join class form state
  const [inviteCode, setInviteCode] = useState('');

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/classes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          gradeLevel: parseInt(gradeLevel),
          classLetter,
          nickname,
          studentCount: parseInt(studentCount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create class');
      }

      // Success! Redirect to dashboard
      router.push('/');
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
      const response = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="min-h-screen bg-base-300 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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
              className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
            >
              <div className="absolute left-0 top-0 w-1 h-full bg-secondary/30 group-hover:bg-secondary group-hover:w-2 transition-all duration-200"></div>
              
              <div className="px-8 py-6 pl-10">
                <div className="flex items-start justify-between mb-3">
                  <svg className="w-8 h-8 stroke-current text-secondary" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
                  </svg>
                </div>
                
                <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                  Tilmeld Klasse
                </h3>
                
                <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                  Brug en invitationskode til at tilmelde dig
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Create Class Form */}
        {step === 'create' && (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
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
            </div>

            <form onSubmit={handleCreateClass} className="p-6 space-y-4">
              {error && (
                <div className="alert alert-error alert-outline">
                  <span className="text-xs font-mono uppercase tracking-wider">{error}</span>
                </div>
              )}

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Skole Information</legend>
                
                <label className="input">
                  <span className="label">Skole Navn</span>
                  <input
                    type="text"
                    placeholder="F.eks. Sønderskov Skole"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    required
                  />
                </label>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Klasse Detaljer</legend>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="input">
                    <span className="label">Klassetrin</span>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="select"
                      required
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                        <option key={grade} value={grade}>
                          {grade}. klasse
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="input">
                    <span className="label">Klasse Bogstav</span>
                    <select
                      value={classLetter}
                      onChange={(e) => setClassLetter(e.target.value)}
                      className="select"
                      required
                    >
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(letter => (
                        <option key={letter} value={letter}>
                          {letter}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="input">
                  <span className="label">Kælenavn (valgfrit)</span>
                  <input
                    type="text"
                    placeholder="F.eks. De Seje, Løverne"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </label>
                <p className="label text-xs">Et sjovt navn til klassen</p>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Elever</legend>
                
                <label className="input">
                  <span className="label">Antal Elever</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={studentCount}
                    onChange={(e) => setStudentCount(e.target.value)}
                    required
                  />
                </label>
                <p className="label text-xs">
                  Dette opretter pladser som eleverne kan tilmelde sig med invitationskoden
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
      </div>
    </div>
  );
}
