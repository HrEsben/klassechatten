'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/lib/supabase';

interface ClassData {
  id: string;
  label: string;
  grade_level: number;
  nickname: string | null;
  moderation_level: 'strict' | 'moderate' | 'relaxed';
  profanity_filter_enabled: boolean;
}

export default function ClassSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useUserProfile(classId);
  
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [nickname, setNickname] = useState('');
  const [moderationLevel, setModerationLevel] = useState<'strict' | 'moderate' | 'relaxed'>('moderate');
  const [profanityFilterEnabled, setProfanityFilterEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Theme controller setup
  useEffect(() => {
    const THEME_KEY = 'klassechatten-theme';
    
    // Initialize theme controllers based on current theme
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'funkyfred';
    const themeControllers = document.querySelectorAll<HTMLInputElement>('.theme-controller');
    themeControllers.forEach(controller => {
      controller.checked = controller.value === currentTheme;
    });
    
    // Listen for theme changes
    const handleThemeChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.classList.contains('theme-controller')) {
        const theme = target.checked ? target.value : 'funkyfred';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        
        // Update all theme controllers
        const allControllers = document.querySelectorAll<HTMLInputElement>('.theme-controller');
        allControllers.forEach(controller => {
          controller.checked = controller.value === theme;
        });
      }
    };
    
    document.addEventListener('change', handleThemeChange);
    return () => document.removeEventListener('change', handleThemeChange);
  }, []);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isClassAdmin, setIsClassAdmin] = useState(false);

  // Check permissions and load class data
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // Check if user is admin or class admin
        const { data: membership } = await supabase
          .from('class_members')
          .select('is_class_admin')
          .eq('user_id', user.id)
          .eq('class_id', classId)
          .single();

        const isAdmin = profile?.role === 'admin';
        const isClassAdminUser = membership?.is_class_admin === true;
        
        setIsClassAdmin(isClassAdminUser);

        if (!isAdmin && !isClassAdminUser) {
          router.push('/');
          return;
        }

        // Load class data
        const { data: classInfo, error: classError } = await supabase
          .from('classes')
          .select('id, label, grade_level, nickname, moderation_level, profanity_filter_enabled')
          .eq('id', classId)
          .single();

        if (classError) throw classError;
        
        setClassData(classInfo);
        setNickname(classInfo.nickname || '');
        setModerationLevel(classInfo.moderation_level || 'moderate');
        setProfanityFilterEnabled(classInfo.profanity_filter_enabled ?? true);
      } catch (err) {
        console.error('Error loading class data:', err);
        setError('Kunne ikke indlæse klassedata');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, classId, profile, router]);

  const handleSave = async () => {
    if (!classData) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Get session token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          nickname: nickname.trim() || null,
          moderation_level: moderationLevel,
          profanity_filter_enabled: profanityFilterEnabled
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update');
      }

      setSuccessMessage('Indstillinger gemt!');
      
      // Update local state
      setClassData({ 
        ...classData, 
        nickname: nickname.trim() || null, 
        moderation_level: moderationLevel,
        profanity_filter_enabled: profanityFilterEnabled
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving nickname:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke gemme klassenavn');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push(`/?class=${classId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-300">
        <div className="flex flex-col items-center gap-6">
          <span className="loading loading-ball loading-lg text-primary"></span>
          <p className="text-base-content/60 font-medium">Indlæser...</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-300">
        <div className="bg-error/10 border-2 border-error/20 px-6 py-4 font-mono text-error text-sm">
          Klasse ikke fundet
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-300 flex flex-col">
      {/* Edgy Berlin Header */}
      <header className="bg-base-100 border-b-2 border-base-content/10">
        <div className="w-full px-4 lg:px-0 lg:grid lg:grid-cols-[256px_1fr]">
          <div className="flex items-center justify-between py-4 lg:justify-end lg:pl-12">
            {/* Logo/Brand with accent bar - right aligned on desktop */}
            <div className="flex flex-col lg:items-end">
              <h1 
                onClick={() => router.push('/')}
                className="text-xl lg:text-2xl font-black uppercase tracking-tight text-base-content cursor-pointer hover:text-primary transition-colors"
              >
                KlasseChatten
              </h1>
              <div className="h-0.5 w-16 lg:w-20 bg-primary mt-1 lg:ml-auto"></div>
            </div>

            {/* Mobile menu button - shows user controls */}
            <div className="lg:hidden">
              <button
                onClick={handleBack}
                className="btn btn-sm bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
              >
                Tilbage
              </button>
            </div>
          </div>
          
          {/* User Controls for large screens - in second grid column */}
          <div className="hidden lg:flex items-center justify-end gap-6 py-4 px-12">
            {/* User Info */}
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">
                {profile?.role === 'child' ? 'Elev' : profile?.role === 'guardian' ? 'Forælder' : 'Voksen'}
              </span>
              <span className="text-sm font-medium text-base-content">
                {profile?.display_name || user?.user_metadata?.display_name || user?.email}
              </span>
            </div>
            
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
            >
              Tilbage
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 bg-base-300">
        <div className="w-full max-w-4xl mx-auto px-12">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content">
            Indstillinger
          </h1>
          <div className="h-1 w-24 bg-primary mt-2"></div>
          
          <p className="text-xs font-mono uppercase tracking-wider text-base-content/50 mt-4">
            {classData.label} • {classData.grade_level}. klasse
          </p>
        </div>

        {/* Settings Form */}
        <div className="space-y-8">
          {/* Nickname Section */}
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6 border-b-2 border-base-content/10">
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                Klassenavn
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-error/10 border-2 border-error/20 px-6 py-4">
                  <p className="text-sm font-medium text-error">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="bg-success/10 border-2 border-success/20 px-6 py-4">
                  <p className="text-sm font-medium text-success">{successMessage}</p>
                </div>
              )}

              {/* Nickname Input */}
              <div>
                <label className="label">
                  <span className="label text-xs font-bold uppercase tracking-wider text-base-content/50">
                    Brugerdefineret navn (valgfrit)
                  </span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={classData.label}
                  className="input input-md w-full"
                  maxLength={50}
                />
                <p className="text-xs text-base-content/60 mt-2">
                  Standard: <strong>{classData.label}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* AI Moderation Section */}
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6 border-b-2 border-base-content/10">
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                AI-Moderation
              </h2>
              <p className="text-xs text-base-content/60 mt-2">
                Sætter tærskler for automatisk blokering og flagning af beskeder
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Moderation Level Selector */}
              <div className="space-y-4">
                <label className="label">
                  <span className="label text-xs font-bold uppercase tracking-wider text-base-content/50">
                    Moderation Niveau
                  </span>
                </label>
                
                {/* Strict Option */}
                <div className="form-control">
                  <div className="flex items-start gap-4 py-4 cursor-pointer">
                    <input
                      type="radio"
                      name="moderation_level"
                      value="strict"
                      checked={moderationLevel === 'strict'}
                      onChange={(e) => setModerationLevel(e.target.value as 'strict' | 'moderate' | 'relaxed')}
                      className="radio radio-primary shrink-0 mt-0.5"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black uppercase tracking-tight text-base-content">
                          Streng
                        </span>
                        <span className="badge badge-error badge-xs shrink-0">Højeste sikkerhed</span>
                      </div>
                      <p className="text-xs text-base-content/60 leading-relaxed">
                        Laveste tærskler. Blokerer milde problemer. Anbefalet 0.-4. klasse.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Moderate Option */}
                <div className="form-control">
                  <div className="flex items-start gap-4 py-4 cursor-pointer">
                    <input
                      type="radio"
                      name="moderation_level"
                      value="moderate"
                      checked={moderationLevel === 'moderate'}
                      onChange={(e) => setModerationLevel(e.target.value as 'strict' | 'moderate' | 'relaxed')}
                      className="radio radio-primary shrink-0 mt-0.5"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black uppercase tracking-tight text-base-content">
                          Moderat
                        </span>
                        <span className="badge badge-info badge-xs shrink-0">Anbefalet</span>
                      </div>
                      <p className="text-xs text-base-content/60 leading-relaxed">
                        Standard tærskler for skolemiljø. Anbefalet 5.-9. klasse.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Relaxed Option */}
                <div className="form-control">
                  <div className="flex items-start gap-4 py-4 cursor-pointer">
                    <input
                      type="radio"
                      name="moderation_level"
                      value="relaxed"
                      checked={moderationLevel === 'relaxed'}
                      onChange={(e) => setModerationLevel(e.target.value as 'strict' | 'moderate' | 'relaxed')}
                      className="radio radio-primary shrink-0 mt-0.5"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black uppercase tracking-tight text-base-content">
                          Afslappet
                        </span>
                        <span className="badge badge-warning badge-xs shrink-0">Mere frihed</span>
                      </div>
                      <p className="text-xs text-base-content/60 leading-relaxed">
                        Højeste tærskler. Kun alvorlige problemer blokeres. Anbefalet 8.-9. klasse.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profanity Filter Toggle */}
              <div className="divider"></div>
              
              <div className="form-control">
                <div className="flex items-start gap-4 py-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profanityFilterEnabled}
                    onChange={(e) => setProfanityFilterEnabled(e.target.checked)}
                    className="checkbox checkbox-primary shrink-0 mt-0.5"
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black uppercase tracking-tight text-base-content">
                        Danske bandeord filter
                      </span>
                    </div>
                    <p className="text-xs text-base-content/60 leading-relaxed">
                      Blokerer danske bandeord og stødende sprog uafhængigt af moderation niveau.
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-base-200 border-2 border-base-content/10 p-4">
                <p className="text-xs text-base-content/60">
                  <strong>Valgt:</strong> {
                    moderationLevel === 'strict' 
                      ? 'Streng moderation - laveste tærskler, blokerer milde problemer.'
                      : moderationLevel === 'moderate'
                      ? 'Moderat moderation - standard tærskler for skolemiljø.'
                      : 'Afslappet moderation - højeste tærskler, kun alvorlige problemer blokeres.'
                  }
                  {profanityFilterEnabled 
                    ? ' Bandeordfilter aktiveret.'
                    : ' Bandeordfilter deaktiveret.'}
                </p>
              </div>
            </div>
          </div>

          {/* Save Button Section */}
          <div className="flex justify-end gap-4">
            <button
              onClick={handleBack}
              className="btn btn-ghost"
              disabled={saving}
            >
              Annuller
            </button>
            <button
              onClick={handleSave}
              className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Gemmer...
                </>
              ) : (
                'Gem ændringer'
              )}
            </button>
          </div>
        </div>
        </div>
      </main>

      {/* Footer with geometric pattern */}
      <footer className="bg-base-100 border-t-2 border-base-content/10 relative z-50">
        <div className="w-full px-12 py-4 lg:grid lg:grid-cols-[256px_1fr] lg:px-0">
          <div className="flex justify-between items-center lg:flex-col lg:items-end">
            <div className="text-xs font-mono text-base-content/40 uppercase tracking-wider">
              © 2025 KlasseChatten
            </div>
            <div className="flex gap-4 items-center lg:hidden">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-primary"></div>
                <div className="w-2 h-2 bg-secondary"></div>
                <div className="w-2 h-2 bg-accent"></div>
              </div>
              
              {/* Theme Controller Swap - Mobile */}
              <label className="swap swap-rotate">
                <input type="checkbox" className="theme-controller" value="dark" />
                <svg
                  className="swap-off h-5 w-5 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24">
                  <path
                    d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
                </svg>
                <svg
                  className="swap-on h-5 w-5 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24">
                  <path
                    d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
                </svg>
              </label>
            </div>
          </div>
          
          {/* Geometric pattern and theme switcher for large screens - in second grid column */}
          <div className="hidden lg:flex gap-6 items-center justify-between px-12">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-primary"></div>
              <div className="w-2 h-2 bg-secondary"></div>
              <div className="w-2 h-2 bg-accent"></div>
            </div>
            
            {/* Theme Controller Swap */}
            <label className="swap swap-rotate">
              <input type="checkbox" className="theme-controller" value="dark" />
              <svg
                className="swap-off h-6 w-6 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24">
                <path
                  d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
              </svg>
              <svg
                className="swap-on h-6 w-6 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24">
                <path
                  d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
              </svg>
            </label>
          </div>
        </div>
      </footer>

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
    </div>
  );
}
