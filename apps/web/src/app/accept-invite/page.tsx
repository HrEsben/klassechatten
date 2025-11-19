'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock, Mail } from 'lucide-react';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [childName, setChildName] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthAndAccept();
  }, [token]);

  const checkAuthAndAccept = async () => {
    if (!token) {
      setError('Ingen invitation token fundet');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Not logged in - redirect to signup with token preserved
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    setIsAuthenticated(true);

    // Try to accept the invitation
    try {
      const response = await fetch('/api/guardians/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteToken: token }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setChildName(data.childName);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError(data.error || 'Kunne ikke acceptere invitation');
      }
    } catch (err) {
      console.error('[AcceptInvite] Error:', err);
      setError('Der opstod en fejl');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = () => {
    router.push(`/onboarding?invite=${token}`);
  };

  const handleLogin = () => {
    router.push(`/login?redirect=/accept-invite?token=${token}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300 px-4">
        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 max-w-md w-full text-center">
          <span className="loading loading-ball loading-lg text-primary"></span>
          <p className="mt-6 text-base-content/60">Behandler invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300 px-4">
        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 max-w-md w-full">
          <div className="text-center space-y-6">
            <CheckCircle className="w-16 h-16 mx-auto text-success" strokeWidth={2} />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-base-content mb-2">
                Invitation Accepteret
              </h1>
              <div className="h-1 w-24 bg-success mx-auto"></div>
            </div>
            <p className="text-base-content/80">
              Du er nu tilknyttet <strong>{childName}</strong>
            </p>
            <p className="text-xs text-base-content/60">
              Omdirigerer til dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300 px-4">
        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 max-w-md w-full">
          <div className="text-center space-y-6">
            <XCircle className="w-16 h-16 mx-auto text-error" strokeWidth={2} />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-base-content mb-2">
                Kunne Ikke Acceptere
              </h1>
              <div className="h-1 w-24 bg-error mx-auto"></div>
            </div>
            <div className="bg-error/10 border-2 border-error/20 p-6">
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
            <div className="pt-4">
              <Link href="/" className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content">
                Gå til Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300 px-4">
      <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 max-w-md w-full">
        <div className="text-center space-y-6">
          <Mail className="w-16 h-16 mx-auto text-primary" strokeWidth={2} />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-base-content mb-2">
              Forældre Invitation
            </h1>
            <div className="h-1 w-24 bg-primary mx-auto"></div>
          </div>
          <p className="text-base-content/80">
            For at acceptere denne invitation skal du logge ind eller oprette en konto
          </p>
          <div className="space-y-3 pt-4">
            <button
              onClick={handleSignup}
              className="btn btn-lg w-full bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
            >
              Opret Konto
            </button>
            <button
              onClick={handleLogin}
              className="btn btn-lg btn-ghost w-full"
            >
              Log Ind
            </button>
          </div>
          <div className="pt-4 border-t-2 border-base-content/10">
            <p className="text-xs text-base-content/50 uppercase tracking-wider">
              <Clock className="w-4 h-4 inline mr-1" strokeWidth={2} />
              Invitationen udløber om 7 dage
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
