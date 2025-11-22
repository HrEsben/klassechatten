'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppFooter from '@/components/AppFooter';

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // If already authenticated, redirect to home
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Don't show welcome if already authenticated
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-base-300 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12">
        <div className="max-w-2xl w-full text-center space-y-8 sm:space-y-12">
          {/* Hero Section */}
          <div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-base-content mb-4">
              KLASSECHATTEN
            </h1>
            <div className="h-1 w-24 bg-primary mx-auto mb-6 sm:mb-8"></div>
            <p className="text-base sm:text-xl font-bold uppercase tracking-wider text-base-content/60 leading-relaxed">
              SIKKER CHAT<br />TIL SKOLEKLASSER
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
            <button
              onClick={() => router.push('/login')}
              className="btn w-full h-14 bg-primary hover:bg-primary/90 text-primary-content border-0 font-black text-base uppercase tracking-wider transition-all"
            >
              LOG IND
            </button>

            <button
              onClick={() => router.push('/login')}
              className="w-full text-center px-8 py-4 text-sm font-bold uppercase tracking-wider text-base-content/60 hover:text-primary transition-colors border-2 border-base-content/10 hover:border-primary/50"
            >
              OPRET BRUGER
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
