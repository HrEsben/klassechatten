'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Check } from 'lucide-react';
import { LoadingSpinner, ErrorState, FormInput } from '@/components/shared';
import AppLayout from '@/components/AppLayout';

interface ProfileData {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  avatar_color: string | null;
  role: 'child' | 'guardian' | 'adult' | 'admin';
}

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarColor, setAvatarColor] = useState('#ff3fa4');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const avatarColors = [
    { name: 'Pink', value: '#ff3fa4' },
    { name: 'Orange', value: '#ffb347' },
    { name: 'Green', value: '#7fdb8f' },
    { name: 'Blue', value: '#6b9bd1' },
    { name: 'Yellow', value: '#ffd966' },
    { name: 'Purple', value: '#6247f5' },
    { name: 'Red', value: '#e86b6b' },
    { name: 'Teal', value: '#5dd9c1' },
  ];

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, avatar_color, role')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        setProfile(profileData);
        setDisplayName(profileData.display_name || '');
        setAvatarColor(profileData.avatar_color || '#ff3fa4');
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Kunne ikke indlæse profil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, router]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!user || !profile) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Get fresh session to ensure we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Session udløbet. Log venligst ind igen.');
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || profile.display_name,
          avatar_color: avatarColor,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      setSuccessMessage('Profil opdateret!');
      setProfile({ ...profile, display_name: displayName.trim() || profile.display_name, avatar_color: avatarColor });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke opdatere profil');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'child': return 'Elev';
      case 'guardian': return 'Forælder';
      case 'adult': return 'Voksen';
      case 'admin': return 'Administrator';
      default: return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!profile) {
    return <ErrorState message="Profil ikke fundet" fullScreen />;
  }

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="py-8">
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-12">
          <div className="space-y-8">
            {/* Profile Card */}
            <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
              <div className="p-6 border-b-2 border-base-content/10">
                <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                  Profiloplysninger
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="bg-error/10 border-2 border-error/20 px-6 py-4">
                    <p className="text-sm font-medium text-error">{error}</p>
                  </div>
                )}

                {/* Avatar Preview */}
                <div className="flex flex-col items-center gap-4 py-6">
                  <div 
                    className="w-32 h-32 flex items-center justify-center text-4xl font-black"
                    style={{ backgroundColor: avatarColor, color: 'white' }}
                  >
                    {getInitials(displayName || profile.display_name)}
                  </div>
                  <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                    {getRoleLabel(profile.role)}
                  </p>
                </div>

                {/* Display Name Input */}
                <FormInput
                  label="Visningsnavn"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={profile.display_name}
                  helperText="Dette navn vises i chatten og overalt i systemet"
                  maxLength={50}
                />

                {/* Avatar Color Picker */}
                <div className="form-control w-full">
                  <div className="label">
                    <span className="label-text text-xs font-bold uppercase tracking-wider">
                      Avatar Farve
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {avatarColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setAvatarColor(color.value)}
                        className={`relative h-16 border-2 transition-all ${
                          avatarColor === color.value
                            ? 'border-base-content scale-105 shadow-lg'
                            : 'border-base-content/10 hover:border-base-content/30'
                        }`}
                        style={{ backgroundColor: color.value }}
                        aria-label={color.name}
                      >
                        {avatarColor === color.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="w-8 h-8 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* User Email (Read-only) */}
                <FormInput
                  label="Email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  helperText="Email kan ikke ændres"
                  readOnly
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-ghost"
                disabled={saving}
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary"
                disabled={saving || (!displayName.trim() && avatarColor === profile.avatar_color)}
              >
                {saving ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Gemmer...
                  </>
                ) : (
                  'Gem Ændringer'
                )}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Toast Notification */}
      {successMessage && (
        <div className="toast toast-end toast-top">
          <div className="alert alert-success border-2 border-success/20">
            <svg className="w-6 h-6 stroke-current shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="square" strokeLinejoin="miter" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
