'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ClassRoomBrowser from '@/components/ClassRoomBrowser';

function HomePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-base-300 flex flex-col">
      {/* Edgy Berlin Header */}
      <header className="bg-base-100 border-b-2 border-base-content/10">
        <div className="w-full px-4 lg:px-0 lg:grid lg:grid-cols-[256px_1fr]">
          <div className="flex items-center justify-between py-4 lg:justify-end lg:pl-12">
            {/* Logo/Brand with accent bar - right aligned on desktop */}
            <div className="flex flex-col lg:items-end">
              <h1 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-base-content">
                KlasseChatten
              </h1>
              <div className="h-0.5 w-16 lg:w-20 bg-primary mt-1 lg:ml-auto"></div>
            </div>

            {/* Mobile menu button - shows user controls */}
            <div className="lg:hidden">
              <button
                onClick={handleSignOut}
                className="btn btn-sm bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
              >
                Log Ud
              </button>
            </div>
          </div>
          
          {/* User Controls for large screens - in second grid column */}
          <div className="hidden lg:flex items-center justify-end gap-6 py-4 px-12">
            {/* User Info */}
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">
                Bruger
              </span>
              <span className="text-sm font-medium text-base-content">
                {user?.user_metadata?.display_name || user?.email}
              </span>
            </div>
            
            {/* Logout Button */}
            <button
              onClick={handleSignOut}
              className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
            >
              Log Ud
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 bg-base-300">
        <div className="w-full max-w-7xl mx-auto px-12">
          <Suspense fallback={
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-8">
                {/* Custom Loading Animation */}
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-base-content/10 border-t-primary animate-spin"></div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-base-content/40">
                    Indlæser
                  </span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-primary animate-pulse delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-primary animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            </div>
          }>
            <ClassRoomBrowser />
          </Suspense>
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
              {/* Hidden checkbox controls the state */}
              <input type="checkbox" className="theme-controller" value="dark" />

              {/* Sun icon - shows in light mode */}
              <svg
                className="swap-off h-6 w-6 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24">
                <path
                  d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
              </svg>

              {/* Moon icon - shows in dark mode */}
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
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  );
}
