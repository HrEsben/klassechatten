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

      setSuccess(`Konto oprettet for ${displayName}! De kan nu logge ind med brugernavn: ${username}`);
      
      // Reset form
      setUsername('');
      setDisplayName('');
      setPassword('');
      setConfirmPassword('');
      setEmail('');

      // Reload classes to update available slots
      setTimeout(() => {
        loadParentClasses();
        setSuccess('');
      }, 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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
            Opret Barn Konto
          </h1>
          <div className="h-1 w-24 bg-primary mb-4"></div>
          <p className="text-sm text-base-content/60">
            Opret en konto til dit barn så de kan logge ind og chatte med deres klasse
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-info/10 border-2 border-info p-6 mb-6">
          <h3 className="text-sm font-black uppercase tracking-tight text-base-content mb-2">
            Vigtigt
          </h3>
          <ul className="text-xs text-base-content/70 space-y-1 list-disc list-inside">
            <li>Børn kan ikke oprette deres egne konti af sikkerhedsmæssige årsager</li>
            <li>Du som forælder skal oprette kontoen</li>
            <li>Barnet logger ind med brugernavn (ikke email)</li>
            <li>Email er valgfri for børn</li>
          </ul>
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

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Vælg Klasse</legend>
              
              <label className="input">
                <span className="label">Klasse</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="select"
                  required
                  disabled={classes.length === 0}
                >
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.label} {cls.nickname && `(${cls.nickname})`} - {cls.available_slots} ledige pladser
                    </option>
                  ))}
                </select>
              </label>
              {classes.find(c => c.id === selectedClass)?.available_slots === 0 && (
                <p className="label text-xs text-warning">
                  Ingen ledige pladser i denne klasse
                </p>
              )}
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Barn Information</legend>
              
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
                <span className="label">Bekræft Adgangskode</span>
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
