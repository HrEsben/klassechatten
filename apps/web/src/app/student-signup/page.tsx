'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function StudentSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'invite' | 'details'>('invite');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Invite code
  const [inviteCode, setInviteCode] = useState('');
  const [classData, setClassData] = useState<any>(null);

  // Step 2: Student details
  const [studentName, setStudentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleVerifyInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verify invite code exists
      const { data, error: classError } = await supabase
        .from('classes')
        .select('id, label, nickname, schools(name)')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (classError || !data) {
        setError('Ugyldig invitationskode');
        setLoading(false);
        return;
      }

      // Check if there are available placeholder slots
      const { data: placeholders, error: placeholderError } = await supabase
        .from('profiles')
        .select('user_id, class_members!inner(class_id)')
        .eq('is_placeholder', true)
        .is('claimed_at', null)
        .eq('class_members.class_id', data.id)
        .limit(1);

      if (placeholderError) {
        console.error('Error checking placeholders:', placeholderError);
        setError('Fejl ved kontrol af pladser');
        setLoading(false);
        return;
      }

      if (!placeholders || placeholders.length === 0) {
        setError('Ingen ledige pladser i denne klasse');
        setLoading(false);
        return;
      }

      setClassData(data);
      setStep('details');
    } catch (err: any) {
      setError(err.message || 'Noget gik galt');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create auth account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: studentName,
            role: 'child',
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Kunne ikke oprette konto');
        setLoading(false);
        return;
      }

      // Wait for profile to be created (by trigger)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Claim placeholder using RPC function
      const { data: claimData, error: claimError } = await supabase.rpc('claim_placeholder_student', {
        p_class_invite_code: inviteCode.toUpperCase(),
        p_student_name: studentName,
        p_new_user_id: authData.user.id,
      });

      if (claimError) {
        console.error('Claim error:', claimError);
        setError('Kunne ikke tilmelde klasse: ' + claimError.message);
        setLoading(false);
        return;
      }

      // Success!
      alert('Konto oprettet! Du er nu tilmeldt klassen.');
      router.push('/');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Noget gik galt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-300 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content mb-2">
            Elev Tilmelding
          </h1>
          <div className="h-1 w-24 bg-accent mx-auto mb-4"></div>
          <p className="text-sm text-base-content/60">
            Tilmeld dig din klasse
          </p>
        </div>

        {/* Step 1: Invite Code */}
        {step === 'invite' && (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6 border-b-2 border-base-content/10">
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                Invitationskode
              </h2>
            </div>

            <form onSubmit={handleVerifyInviteCode} className="p-6 space-y-4">
              {error && (
                <div className="alert alert-error alert-outline">
                  <span className="text-xs font-mono uppercase tracking-wider">{error}</span>
                </div>
              )}

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Kode fra Lærer</legend>
                
                <label className="input">
                  <span className="label">8-Cifret Kode</span>
                  <input
                    type="text"
                    placeholder="ABC123XY"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    required
                    className="font-mono uppercase"
                  />
                </label>
                <p className="label text-xs">
                  Spørg din lærer om koden
                </p>
              </fieldset>

              <button
                type="submit"
                className="btn w-full bg-base-content text-base-100 hover:bg-accent hover:text-accent-content"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Næste'
                )}
              </button>

              <div className="text-center">
                <a href="/login" className="text-xs text-base-content/60 hover:text-primary">
                  Har du allerede en konto? Log ind
                </a>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Student Details */}
        {step === 'details' && classData && (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6 border-b-2 border-base-content/10">
              <button
                onClick={() => setStep('invite')}
                className="btn btn-ghost btn-sm mb-2"
              >
                ← Tilbage
              </button>
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                Opret Din Konto
              </h2>
              <p className="text-xs text-base-content/60 mt-2">
                Klasse: {classData.label} {classData.nickname && `(${classData.nickname})`}
              </p>
            </div>

            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              {error && (
                <div className="alert alert-error alert-outline">
                  <span className="text-xs font-mono uppercase tracking-wider">{error}</span>
                </div>
              )}

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Dine Oplysninger</legend>
                
                <label className="input">
                  <span className="label">Dit Navn</span>
                  <input
                    type="text"
                    placeholder="F.eks. Emil Hansen"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                    minLength={2}
                  />
                </label>

                <label className="input">
                  <span className="label">Email</span>
                  <input
                    type="email"
                    placeholder="din@email.dk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>

                <label className="input">
                  <span className="label">Adgangskode</span>
                  <input
                    type="password"
                    placeholder="Minimum 6 tegn"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </label>
                <p className="label text-xs">
                  Vælg en stærk adgangskode
                </p>
              </fieldset>

              <button
                type="submit"
                className="btn w-full bg-base-content text-base-100 hover:bg-accent hover:text-accent-content"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Opret Konto'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
