import { Suspense, ReactNode } from 'react';
import Link from 'next/link';

interface CachedWrapperProps {
  children: ReactNode;
}

/**
 * Cached wrapper component that provides static shell around dynamic content
 * Note: This is a regular server component. For 'use cache' examples, see the cache-demo page.
 */
export default async function CachedWrapper({ children }: CachedWrapperProps) {
  // Simulate some expensive computation or data fetching
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      {/* Static header - cached */}
      <header className="navbar bg-base-100 shadow-lg px-4">
        <div className="navbar-start">
          <h1 className="text-xl font-bold text-primary">KlasseChatten</h1>
          <div className="badge badge-accent badge-sm ml-2">CACHED</div>
        </div>
        <div className="navbar-center">
          <nav className="hidden md:flex">
            <ul className="menu menu-horizontal px-1">
              <li><Link href="/" className="text-base-content/70 hover:text-primary">Classes</Link></li>
              <li><Link href="/profile" className="text-base-content/70 hover:text-primary">Profile</Link></li>
            </ul>
          </nav>
        </div>
        <div className="navbar-end">
          {/* Dynamic user info will be inserted here by children */}
        </div>
      </header>

      {/* Main content area - dynamic children passed through without caching */}
      <main className="flex-1 overflow-auto">
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-96">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        }>
          {children}
        </Suspense>
      </main>

      {/* Static footer - cached */}
      <footer className="footer footer-center p-4 bg-base-300 text-base-content">
        <div>
          <p className="text-sm">
            KlasseChatten - Secure school communication platform
            <span className="badge badge-ghost badge-xs ml-2">Cached Layout</span>
          </p>
        </div>
      </footer>
    </div>
  );
}