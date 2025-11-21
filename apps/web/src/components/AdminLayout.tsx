'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserClasses } from '@/hooks/useUserClasses';
import Breadcrumbs from './Breadcrumbs';
import UserMenu from './UserMenu';
import { Home, LayoutList, Users, TriangleAlert, Settings, MessageSquare, CirclePlus, Menu, Activity } from 'lucide-react';

export default function AdminLayout({ 
  children,
  classData,
  classId
}: { 
  children: React.ReactNode;
  classData?: { name: string; school_name?: string };
  classId?: string;
}) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { profile, roleLabel, isClassAdmin } = useUserProfile(classId);
  const { classes } = useUserClasses();
  
  const isGlobalAdmin = profile?.role === 'admin';
  const adminClasses = classes.filter(c => c.is_class_admin);
  
  // Helper function to determine if a link is active
  const isActive = (path: string) => pathname === path;

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-base-300 flex flex-col lg:grid lg:grid-rows-[auto_1fr_auto] lg:grid-cols-[256px_1fr]">
      {/* Edgy Berlin Header */}
      <header className="bg-base-100 border-b-2 border-base-content/10 lg:col-span-2">
        <div className="w-full px-4 lg:px-0 lg:grid lg:grid-cols-[256px_1fr]">
          <div className="flex items-center justify-between py-4 lg:justify-end lg:pl-12">
            {/* Logo/Brand with accent bar - right aligned on desktop */}
            <div className="flex flex-col lg:items-end">
              <h1 
                onClick={() => router.push(isGlobalAdmin ? '/admin' : '/')}
                className="text-xl lg:text-2xl font-black uppercase tracking-tight text-base-content cursor-pointer hover:text-primary transition-colors"
              >
                KlasseChatten
              </h1>
              <div className="h-0.5 w-16 lg:w-20 bg-primary mt-1 lg:ml-auto"></div>
            </div>

            {/* Mobile menu button - shows user controls */}
            <div className="lg:hidden">
              <UserMenu 
                userName={profile?.display_name || user?.user_metadata?.display_name || user?.email}
                userRole={roleLabel + (isClassAdmin ? ' ⁺' : '')}
                avatarUrl={profile?.avatar_url}
              />
            </div>
          </div>
          
          {/* User Controls for large screens - in second grid column */}
          <div className="hidden lg:flex items-center justify-end gap-6 py-4 px-4 sm:px-12">
            {/* User Info */}
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">
                {roleLabel}{isClassAdmin && '⁺'}
              </span>
              <span className="text-sm font-medium text-base-content">
                {profile?.display_name || user?.user_metadata?.display_name || user?.email}
              </span>
            </div>
            
            {/* User Menu with Notifications and Logout */}
            <UserMenu 
              userName={profile?.display_name || user?.user_metadata?.display_name || user?.email}
              userRole={roleLabel + (isClassAdmin ? ' ⁺' : '')}
              avatarUrl={profile?.avatar_url}
            />
          </div>
        </div>
      </header>

      {/* Sidebar Navigation - Desktop Only */}
      <aside className="hidden lg:flex flex-col bg-base-100 border-r-2 border-base-content/10 h-full">
        <nav className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Global Admin Menu */}
          {isGlobalAdmin && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-base-content/50 px-4 mb-4">
                System Administration
              </p>
              <Link
                href="/admin"
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all border-l-2 ${
                  isActive('/admin')
                    ? 'bg-primary/20 border-primary text-primary font-bold'
                    : 'text-base-content border-transparent hover:bg-primary/10 hover:border-primary'
                }`}
              >
                <Home className="w-5 h-5 stroke-current" strokeWidth={2} />
                Dashboard
              </Link>
              <Link
                href="/admin/classes"
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all border-l-2 ${
                  isActive('/admin/classes')
                    ? 'bg-primary/20 border-primary text-primary font-bold'
                    : 'text-base-content border-transparent hover:bg-primary/10 hover:border-primary'
                }`}
              >
                <LayoutList className="w-5 h-5 stroke-current" strokeWidth={2} />
                Klasser
              </Link>
              <Link
                href="/admin/users"
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all border-l-2 ${
                  isActive('/admin/users')
                    ? 'bg-primary/20 border-primary text-primary font-bold'
                    : 'text-base-content border-transparent hover:bg-primary/10 hover:border-primary'
                }`}
              >
                <Users className="w-5 h-5 stroke-current" strokeWidth={2} />
                Brugere
              </Link>
              <Link
                href="/admin/flagged-messages"
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all border-l-2 ${
                  isActive('/admin/flagged-messages')
                    ? 'bg-primary/20 border-primary text-primary font-bold'
                    : 'text-base-content border-transparent hover:bg-primary/10 hover:border-primary'
                }`}
              >
                <TriangleAlert className="w-5 h-5 stroke-current" strokeWidth={2} />
                Moderation
              </Link>
              <Link
                href="/admin/performance"
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all border-l-2 ${
                  isActive('/admin/performance')
                    ? 'bg-primary/20 border-primary text-primary font-bold'
                    : 'text-base-content border-transparent hover:bg-primary/10 hover:border-primary'
                }`}
              >
                <Activity className="w-5 h-5 stroke-current" strokeWidth={2} />
                Performance
              </Link>
            </div>
          )}

          {/* Class Admin Menu */}
          {!isGlobalAdmin && adminClasses.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-base-content/50 px-4 mb-4">
                Mine Klasser
              </p>
              {adminClasses.map((cls) => (
                <div key={cls.id} className="mb-4">
                  <div className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-base-content/70">
                    {cls.nickname || cls.label}
                  </div>
                  <Link
                    href={`/?class=${cls.id}`}
                    className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-all border-l-2 ${
                      pathname === '/' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('class') === cls.id
                        ? 'bg-primary/20 border-primary text-primary font-bold'
                        : 'text-base-content border-transparent hover:bg-primary/10 hover:border-primary'
                    }`}
                  >
                    <CirclePlus className="w-5 h-5 stroke-current" strokeWidth={2} />
                    Kanaler
                  </Link>
                  <Link
                    href={`/admin/flagged-messages?class_id=${cls.id}`}
                    className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-all border-l-2 ${
                      pathname === '/admin/flagged-messages' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('class_id') === cls.id
                        ? 'bg-primary/20 border-primary text-primary font-bold'
                        : 'text-base-content border-transparent hover:bg-primary/10 hover:border-primary'
                    }`}
                  >
                    <TriangleAlert className="w-5 h-5 stroke-current" strokeWidth={2} />
                    Flaggede Beskeder
                  </Link>
                  <Link
                    href={`/class/${cls.id}/settings`}
                    className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-all border-l-2 ${
                      isActive(`/class/${cls.id}/settings`)
                        ? 'bg-primary/20 border-primary text-primary font-bold'
                        : 'text-base-content border-transparent hover:bg-primary/10 hover:border-primary'
                    }`}
                  >
                    <Settings className="w-5 h-5 stroke-current" strokeWidth={2} />
                    Indstillinger
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          {(isGlobalAdmin || adminClasses.length > 0) && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-base-content/50 px-4 mb-4">
                Hurtige Genveje
              </p>
              <Link
                href="/"
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all border-l-2 ${
                  isActive('/')
                    ? 'bg-primary/20 border-primary text-primary font-bold'
                    : 'text-base-content border-transparent hover:bg-primary/10 hover:border-primary'
                }`}
              >
                <MessageSquare className="w-5 h-5 stroke-current" strokeWidth={2} />
                Mine Beskeder
              </Link>
            </div>
          )}
        </nav>
      </aside>

      {/* Mobile Menu - Hamburger/Dropdown */}
      <div className="lg:hidden dropdown">
        <button tabIndex={0} className="btn btn-ghost btn-sm m-1">
          <Menu className="w-5 h-5" strokeWidth={2} />
          Meny
        </button>
        <ul
          tabIndex={0}
          className="dropdown-content z-1 menu p-2 shadow bg-base-100 rounded-none border-2 border-base-content/10 w-64 max-h-96 overflow-y-auto"
        >
          {isGlobalAdmin ? (
            <>
              <li className="menu-title"><span>System Administration</span></li>
              <li><Link href="/admin" className={isActive('/admin') ? 'active' : ''}>Dashboard</Link></li>
              <li><Link href="/admin/classes" className={isActive('/admin/classes') ? 'active' : ''}>Klasser</Link></li>
              <li><Link href="/admin/users" className={isActive('/admin/users') ? 'active' : ''}>Brugere</Link></li>
              <li><Link href="/admin/flagged-messages" className={isActive('/admin/flagged-messages') ? 'active' : ''}>Moderation</Link></li>
              <li><Link href="/admin/performance" className={isActive('/admin/performance') ? 'active' : ''}>Performance</Link></li>
              <li className="menu-title"><span>Hurtige Genveje</span></li>
              <li><Link href="/" className={isActive('/') ? 'active' : ''}>Mine Beskeder</Link></li>
            </>
          ) : adminClasses.length > 0 ? (
            <>
              {adminClasses.map((cls) => (
                <React.Fragment key={cls.id}>
                  <li className="menu-title"><span>{cls.nickname || cls.label}</span></li>
                  <li><Link href={`/?class=${cls.id}`}>Kanaler</Link></li>
                  <li><Link href={`/admin/flagged-messages?class_id=${cls.id}`}>Flaggede Beskeder</Link></li>
                  <li><Link href={`/class/${cls.id}/settings`}>Indstillinger</Link></li>
                </React.Fragment>
              ))}
              <li className="menu-title"><span>Hurtige Genveje</span></li>
              <li><Link href="/">Mine Beskeder</Link></li>
            </>
          ) : (
            <li><Link href="/">Mine Beskeder</Link></li>
          )}
        </ul>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 py-8 bg-base-300 lg:col-span-1">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          {/* Breadcrumb Navigation - Only show if classData exists */}
          {classData && (
            <div className="mb-6">
              <Breadcrumbs classData={classData} />
            </div>
          )}
          
          {children}
        </div>
      </main>

      {/* Footer with geometric pattern */}
      <footer className="bg-base-100 border-t-2 border-base-content/10 lg:col-span-2 relative z-50">
        <div className="w-full px-4 sm:px-12 py-4 lg:grid lg:grid-cols-[256px_1fr] lg:px-0">
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
          <div className="hidden lg:flex gap-6 items-center justify-between px-4 sm:px-12">
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
    </div>
  );
}
