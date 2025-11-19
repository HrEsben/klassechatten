'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ClassInfo {
  id: string;
  label: string;
  nickname: string | null;
  available_slots: number;
}

export default function CreateChildPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [createdChildId, setCreatedChildId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Email invitation state
  const [coParentEmail, setCoParentEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  
  // Form state
  const [selectedClass, setSelectedClass] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadParentClasses();
  }, [user]);

  const loadParentClasses = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      // Get classes where user is a guardian/adult
      const { data: memberships, error: memberError } = await supabase
        .from('class_members')
        .select('class_id, classes(id, label, nickname)')
        .eq('user_id', user.id)
        .in('role_in_class', ['guardian', 'adult']);

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setError('Du skal oprette en klasse først');
        setLoading(false);
        return;
      }

      // Get available placeholder count for each class
      const classesWithSlots = await Promise.all(
        memberships.map(async (membership: any) => {
          // Get placeholders for this class
          const { data: placeholders, error: plError } = await supabase
            .from('profiles')
            .select('user_id, class_members!inner(class_id)')
            .eq('is_placeholder', true)
            .is('claimed_at', null)
            .eq('class_members.class_id', membership.classes.id);

          return {
            id: membership.classes.id,
            label: membership.classes.label,
            nickname: membership.classes.nickname,
            available_slots: placeholders?.length || 0,
          };
        })
      );

      setClasses(classesWithSlots);
      if (classesWithSlots.length > 0) {
        setSelectedClass(classesWithSlots[0].id);
      }
    } catch (err: any) {
      console.error('Error loading classes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (password !== confirmPassword) {
      setError('Adgangskoder matcher ikke');
      return;
    }

    if (password.length < 6) {
      setError('Adgangskode skal være mindst 6 tegn');
      return;
    }

    if (username.length < 3) {
      setError('Brugernavn skal være mindst 3 tegn');
      return;
    }

    // Username validation (alphanumeric + underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Brugernavn må kun indeholde bogstaver, tal og underscore');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/children/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          username: username.toLowerCase(),
          displayName,
          password,
          email: email || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create child account');
      }

      // Store child ID for invite code generation
      setCreatedChildId(data.child.child_id);
      setSuccess(`Konto oprettet for ${displayName}!`);
      
      // Redirect to child's profile page after a brief success message
      setTimeout(() => {
        router.push(`/child/${data.child.child_id}`);
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateInviteCode = async () => {
    if (!createdChildId) return;
    
    setGeneratingCode(true);
    setError('');

    try {
      const response = await fetch('/api/guardians/generate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: createdChildId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate invite code');
      }

      setInviteCode(data.inviteCode);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdChildId || !coParentEmail) return;

    setSendingInvite(true);
    setError('');

    try {
      const response = await fetch('/api/guardians/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: createdChildId,
          invitedEmail: coParentEmail,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInviteSent(true);
        setSuccess(`Invitation sendt til ${coParentEmail}`);
      } else {
        setError(data.error || 'Kunne ikke sende invitation');
      }
    } catch (err) {
      console.error('[CreateChild] Error sending invite:', err);
      setError('Der opstod en fejl ved afsendelse af invitation');
    } finally {
      setSendingInvite(false);
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
      <div className="w-full max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="btn btn-ghost btn-sm mb-4"
          >
            ← Tilbage til Dashboard
          </button>
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content mb-2">
            Opret Elev-konto
          </h1>
          <div className="h-1 w-24 bg-primary mb-4"></div>
          <p className="text-sm text-base-content/60">
            Som forælder/værge opretter du en konto til barnet. Det er valgfrit, om barnet skal have sin egen e-mailadresse tilknyttet.
          </p>
        </div>

        {/* Form */}
        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
          <div className="p-6 border-b-2 border-base-content/10">
            <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
              Opret Konto
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="alert alert-error alert-outline">
                <span className="text-xs font-mono uppercase tracking-wider">{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success alert-outline">
                <span className="text-xs font-mono uppercase tracking-wider">{success}</span>
              </div>
            )}

            {/* Guardian Invite Code Section */}
            {createdChildId && (
              <div className="bg-accent/10 border-2 border-accent p-6 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-tight text-base-content mb-2">
                  Inviter Anden Forælder
                </h3>
                <p className="text-xs text-base-content/70 mb-4">
                  Vil du give en anden forælder adgang til dette barns data? Generer en invitation som kun den anden forælder kender.
                </p>

                {!inviteCode ? (
                  <button
                    type="button"
                    onClick={handleGenerateInviteCode}
                    className="btn bg-accent text-accent-content hover:bg-accent/80"
                    disabled={generatingCode}
                  >
                    {generatingCode ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Genererer kode...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="square" strokeLinejoin="miter" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Generer Forældre-Kode
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-base-100 border-2 border-accent p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-1">
                          Forældre-Invitation
                        </p>
                        <p className="text-2xl font-black font-mono tracking-wider text-accent">
                          {inviteCode}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="btn btn-square btn-ghost"
                        title="Kopier kode"
                      >
                        {copiedCode ? (
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
                    <div className="bg-warning/10 border-2 border-warning/30 p-4">
                      <p className="text-xs text-base-content/70">
                        <strong className="text-warning font-bold">Vigtigt:</strong> Del kun denne kode med den anden forælder. Når de opretter en konto og indtaster denne kode, får de adgang til barnets data. Koden kan kun bruges én gang.
                      </p>
                    </div>
                  </div>
                )}

                {/* Email Invitation - Better alternative */}
                <div className="mt-6 pt-6 border-t-2 border-base-content/10">
                  <h4 className="text-sm font-black uppercase tracking-tight text-base-content mb-2">
                    Send Invitation via Email
                  </h4>
                  <p className="text-xs text-base-content/70 mb-4">
                    Nemmere: Send en invitation direkte til den anden forældres email. De modtager et link og bliver automatisk tilknyttet.
                  </p>

                  {!inviteSent ? (
                    <form onSubmit={handleSendEmailInvite} className="space-y-3">
                      <label className="input">
                        <span className="label">Anden forældres email</span>
                        <input
                          type="email"
                          placeholder="forælder@eksempel.dk"
                          value={coParentEmail}
                          onChange={(e) => setCoParentEmail(e.target.value)}
                          required
                        />
                      </label>
                      <button
                        type="submit"
                        className="btn bg-primary text-primary-content hover:bg-primary/80 w-full"
                        disabled={sendingInvite || !coParentEmail}
                      >
                        {sendingInvite ? (
                          <>
                            <span className="loading loading-spinner loading-sm"></span>
                            Sender invitation...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="square" strokeLinejoin="miter" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Send Email Invitation
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="bg-success/10 border-2 border-success/30 p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 stroke-current text-success shrink-0" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <p className="text-sm font-bold text-success mb-1">Invitation sendt!</p>
                          <p className="text-xs text-base-content/70">
                            {coParentEmail} har modtaget en invitation. De skal klikke på linket i emailen for at acceptere.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <fieldset className="fieldset">
              <legend className="fieldset-legend">{classes.length > 1 ? 'Vælg klasse' : 'Klasse'}</legend>
              
              {classes.length > 1 ? (
                <label className="input">
                  <span className="label">Klasse</span>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="border-0 bg-transparent outline-none w-full"
                    required
                  >
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.label} {cls.nickname && `(${cls.nickname})`} - {cls.available_slots} ledige pladser
                      </option>
                    ))}
                  </select>
                </label>
              ) : classes.length === 1 ? (
                <div className="px-4 py-3">
                  <p className="text-base-content font-medium">
                    {classes[0].label} {classes[0].nickname && `(${classes[0].nickname})`}
                  </p>
                  <p className="text-xs text-base-content/60 mt-1">
                    {classes[0].available_slots} ledige pladser
                  </p>
                </div>
              ) : null}
              
              {classes.find(c => c.id === selectedClass)?.available_slots === 0 && (
                <p className="label text-xs text-warning">
                  Ingen ledige pladser i denne klasse
                </p>
              )}
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Barn information</legend>
              
              <label className="input">
                <span className="label">Fulde Navn</span>
                <input
                  type="text"
                  placeholder="F.eks. Emma Nielsen"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  minLength={2}
                />
              </label>

              <label className="input">
                <span className="label">Brugernavn</span>
                <input
                  type="text"
                  placeholder="F.eks. emma2015"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="[a-z0-9_]+"
                  className="font-mono"
                  autoComplete="off"
                  name="child-username"
                />
              </label>
              <p className="label text-xs">
                Kun små bogstaver, tal og underscore. Dette bruges til login.
              </p>

              <label className="input">
                <span className="label">Email (valgfri)</span>
                <input
                  type="email"
                  placeholder="barnets@email.dk (valgfri)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <p className="label text-xs">
                Email er valgfri. Kan bruges til gendannelse af adgangskode.
              </p>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Adgangskode</legend>
              
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

              <label className="input">
                <span className="label">Bekræft</span>
                <input
                  type="password"
                  placeholder="Gentag adgangskode"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </label>
              <p className="label text-xs">
                Vælg en adgangskode dit barn kan huske
              </p>
            </fieldset>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="btn btn-ghost"
                disabled={submitting}
              >
                Annuller
              </button>
              <button
                type="submit"
                className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
                disabled={submitting || classes.find(c => c.id === selectedClass)?.available_slots === 0}
              >
                {submitting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Opret Konto'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
