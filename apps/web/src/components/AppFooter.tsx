'use client';

import { ThemeController } from '@/components/ThemeController';
import { usePathname } from 'next/navigation';

export default function AppFooter() {
  const pathname = usePathname();

  // Don't show footer on login/onboarding pages
  if (pathname === '/login' || pathname === '/onboarding' || pathname === '/student-signup') {
    return null;
  }

  return (
    <footer className="hidden md:flex md:flex-none bg-base-100 border-t-2 border-base-content/10 z-50">
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
            
            {/* Theme Controller - Mobile */}
            <ThemeController />
          </div>
        </div>
        
        {/* Geometric pattern and theme switcher for large screens - in second grid column */}
        <div className="hidden lg:flex gap-6 items-center justify-between px-4 sm:px-12">
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-primary"></div>
            <div className="w-2 h-2 bg-secondary"></div>
            <div className="w-2 h-2 bg-accent"></div>
          </div>
          
          {/* Theme Controller */}
          <ThemeController />
        </div>
      </div>
    </footer>
  );
}
