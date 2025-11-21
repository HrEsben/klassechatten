'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

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
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center space-y-12">
          {/* Hero Section */}
          <div>
            <h1 className="text-6xl font-black uppercase tracking-tight text-base-content mb-4">
              KLASSECHATTEN
            </h1>
            <div className="h-1 w-24 bg-primary mx-auto mb-8"></div>
            <p className="text-xl font-bold uppercase tracking-wider text-base-content/60">
              SIKKER CHAT<br />TIL SKOLEKLASSER
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content border-0 text-lg px-12 py-4"
            >
              LOG IND
            </Link>

            <Link
              href="/login"
              className="btn btn-outline border-2 border-base-content text-base-content hover:bg-base-content hover:text-base-100 text-lg px-12 py-4"
            >
              OPRET BRUGER
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-8 flex justify-center">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-primary"></div>
          <div className="w-2 h-2 bg-secondary"></div>
          <div className="w-2 h-2 bg-accent"></div>
        </div>
      </div>
    </div>
  );
}
