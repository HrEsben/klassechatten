'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Mail, Users, Calendar, Shield, Send } from 'lucide-react';

interface ChildProfile {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
  avatar_color: string;
}

interface Guardian {
  id: string;
  username: string;
  display_name: string;
  email: string;
}

interface PendingInvitation {
  id: string;
  invited_email: string;
  created_at: string;
  expires_at: string;
}

interface ClassMembership {
  class_id: string;
  class_label: string;
  class_nickname: string | null;
  role_in_class: string;
}

export default function ChildProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: childId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
  const [classes, setClasses] = useState<ClassMembership[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [coParentEmail, setCoParentEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [cancellingInvite, setCancellingInvite] = useState<string | null>(null);

  useEffect(() => {
    loadChildProfile();
  }, [childId, user]);

  const loadChildProfile = async (retryCount = 0) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      // Check if user is a guardian of this child
      const { data: guardianLink, error: linkError } = await supabase
        .from('guardian_links')
        .select('*')
        .eq('guardian_user_id', user.id)
        .eq('child_user_id', childId)
        .single();

      if (linkError || !guardianLink) {
        // Retry up to 3 times with exponential backoff (for race condition after accepting invite)
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
          console.log(`[ChildProfile] Guardian link not found, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadChildProfile(retryCount + 1);
        }
        
        setError('Du har ikke adgang til denne elevs profil');
        setLoading(false);
        return;
      }

      // Get child profile
      const { data: childProfile, error: childError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, created_at, avatar_color')
        .eq('user_id', childId)
        .single();

      if (childError || !childProfile) {
        setError('Eleven blev ikke fundet');
        setLoading(false);
        return;
      }

      setChild({
        id: childProfile.user_id,
        username: childProfile.username,
        display_name: childProfile.display_name,
        created_at: childProfile.created_at,
        avatar_color: childProfile.avatar_color,
      });

      // Get all guardians of this child
      const { data: guardianLinks, error: guardiansError } = await supabase
        .from('guardian_links')
        .select('guardian_user_id')
        .eq('child_user_id', childId);

      if (!guardiansError && guardianLinks) {
        const guardianIds = guardianLinks.map((link) => link.guardian_user_id);

        const { data: guardianProfiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name')
          .in('user_id', guardianIds);

        if (guardianProfiles) {
          // Get emails from auth.users
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const emailMap = new Map(
            authUsers.users.map((u) => [u.id, u.email || ''])
          );

          setGuardians(
            guardianProfiles.map((p) => ({
              id: p.user_id,
              username: p.username,
              display_name: p.display_name,
              email: emailMap.get(p.user_id) || '',
            }))
          );
        }
      }

      // Get child's class memberships
      const { data: memberships, error: classError } = await supabase
        .from('class_members')
        .select('class_id, role_in_class, classes(id, label, nickname)')
        .eq('user_id', childId);

      if (!classError && memberships) {
        setClasses(
          memberships.map((m: any) => ({
            class_id: m.classes.id,
            class_label: m.classes.label,
            class_nickname: m.classes.nickname,
            role_in_class: m.role_in_class,
          }))
        );
      }

      // Get pending invitations
      const invitesResponse = await fetch(`/api/guardians/pending-invites?childId=${childId}`);
      if (invitesResponse.ok) {
        const invitesData = await invitesResponse.json();
        setPendingInvites(invitesData.invitations || []);
      }
    } catch (err: any) {
      console.error('Error loading child profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child || !coParentEmail) return;

    setSendingInvite(true);
    setError('');

    try {
      const response = await fetch('/api/guardians/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: child.id,
          invitedEmail: coParentEmail,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInviteSent(true);
        setShowInviteForm(false);
        // Reload to show new pending invitation
        setTimeout(() => {
          setCoParentEmail('');
          setInviteSent(false);
          loadChildProfile();
        }, 3000);
      } else {
        setError(data.error || 'Kunne ikke sende invitation');
      }
    } catch (err) {
      console.error('[ChildProfile] Error sending invite:', err);
      setError('Der opstod en fejl ved afsendelse af invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    if (!confirm('Er du sikker på, at du vil annullere denne invitation?')) {
      return;
    }

    setCancellingInvite(invitationId);
    setError('');

    try {
      const response = await fetch('/api/guardians/cancel-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Reload to update pending invitations
        loadChildProfile();
      } else {
        setError(data.error || 'Kunne ikke annullere invitation');
      }
    } catch (err) {
      console.error('[ChildProfile] Error cancelling invite:', err);
      setError('Der opstod en fejl ved annullering af invitation');
    } finally {
      setCancellingInvite(null);
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

  if (error || !child) {
    return (
      <div className="min-h-screen bg-base-300 p-4">
        <div className="w-full max-w-2xl mx-auto py-8">
          <div className="alert alert-error alert-outline">
            <span className="text-xs font-mono uppercase tracking-wider">
              {error || 'Eleven blev ikke fundet'}
            </span>
          </div>
          <Link href="/" className="btn btn-ghost mt-4">
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            Tilbage til Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-300 p-4">
      <div className="w-full max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="btn btn-ghost btn-sm mb-4">
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            Tilbage til Dashboard
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content mb-2">
            Barn Profil
          </h1>
          <div className="h-1 w-24 bg-primary mb-4"></div>
        </div>

        {/* Success message */}
        {inviteSent && (
          <div className="alert alert-success alert-outline mb-6">
            <span className="text-xs font-mono uppercase tracking-wider">
              Invitation sendt til {coParentEmail}!
            </span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Child Info Card */}
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6 border-b-2 border-base-content/10">
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                Barn Information
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 flex items-center justify-center text-3xl font-black text-white"
                  style={{ backgroundColor: child.avatar_color }}
                >
                  {child.username?.[0]?.toUpperCase() || child.display_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-base-content">
                    {child.display_name || 'Barn'}
                  </h3>
                  <p className="text-sm text-base-content/60">@{child.username || 'ingen_brugernavn'}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-base-content/60 mt-0.5" strokeWidth={2} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-base-content/50">
                      Oprettet
                    </p>
                    <p className="text-sm text-base-content">
                      {new Date(child.created_at).toLocaleDateString('da-DK', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Class Membership */}
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-base-content/60 mt-0.5" strokeWidth={2} />
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-2">
                      Klasse{classes.length !== 1 ? 'r' : ''}
                    </p>
                    {classes.length > 0 ? (
                      <div className="space-y-2">
                        {classes.map((cls) => (
                          <div
                            key={cls.class_id}
                            className="p-2 bg-base-200 border-2 border-base-content/10"
                          >
                            <p className="text-sm font-bold text-base-content">
                              {cls.class_label}
                            </p>
                            {cls.class_nickname && (
                              <p className="text-xs text-base-content/60">
                                {cls.class_nickname}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-base-content/60">
                        Ikke medlem af nogen klasser
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Guardians Card */}
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
            <div className="p-6 border-b-2 border-base-content/10">
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
                Forældre/Værger
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Active Guardians */}
              {guardians.map((guardian) => (
                <div
                  key={guardian.id}
                  className="flex items-center gap-3 p-3 bg-base-200 border-2 border-base-content/10"
                >
                  <Shield className="w-5 h-5 text-primary" strokeWidth={2} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-base-content">
                      {guardian.display_name}
                    </p>
                    <p className="text-xs text-base-content/60 truncate">
                      {guardian.email}
                    </p>
                  </div>
                </div>
              ))}

              {/* Pending Invitations */}
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-3 p-3 bg-warning/10 border-2 border-warning/30"
                >
                  <Mail className="w-5 h-5 text-warning" strokeWidth={2} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-base-content flex items-center gap-2">
                      <span className="badge badge-warning badge-sm font-bold uppercase">Afventer</span>
                      {invite.invited_email}
                    </p>
                    <p className="text-xs text-base-content/60">
                      Sendt {new Date(invite.created_at).toLocaleDateString('da-DK')}
                      {' • '}
                      Udløber {new Date(invite.expires_at).toLocaleDateString('da-DK')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    disabled={cancellingInvite === invite.id}
                    className="btn btn-xs btn-ghost text-error"
                  >
                    {cancellingInvite === invite.id ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      'Annuller'
                    )}
                  </button>
                </div>
              ))}

              {(guardians.length + pendingInvites.length) < 2 && !showInviteForm && (
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="btn btn-sm bg-primary text-primary-content hover:bg-primary/80 w-full"
                >
                  <Send className="w-4 h-4" strokeWidth={2} />
                  Inviter anden forælder
                </button>
              )}

              {pendingInvites.length > 0 && (guardians.length + pendingInvites.length) >= 2 && (
                <div className="bg-info/10 border-2 border-info/30 p-3">
                  <p className="text-xs text-info font-medium">
                    Du kan annullere den afventende invitation for at sende en ny til en anden email.
                  </p>
                </div>
              )}

              {showInviteForm && (
                <form onSubmit={handleSendInvite} className="space-y-3 pt-2 border-t-2 border-base-content/10">
                  {pendingInvites.length > 0 && (
                    <div className="bg-warning/10 border-2 border-warning/30 p-3">
                      <p className="text-xs text-warning font-medium">
                        Afsendelse af en ny invitation vil erstatte den nuværende afventende invitation.
                      </p>
                    </div>
                  )}
                  <label className="input input-sm">
                    <span className="label text-xs">Email</span>
                    <input
                      type="email"
                      placeholder="forælder@eksempel.dk"
                      value={coParentEmail}
                      onChange={(e) => setCoParentEmail(e.target.value)}
                      required
                      className="text-sm"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-sm bg-primary text-primary-content hover:bg-primary/80 flex-1"
                      disabled={sendingInvite || !coParentEmail}
                    >
                      {sendingInvite ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        'Send'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInviteForm(false)}
                      className="btn btn-sm btn-ghost"
                    >
                      Annuller
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
