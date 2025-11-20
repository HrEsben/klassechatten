'use client';

import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-svh bg-base-300 overflow-hidden">
      <AppHeader />
      <main className="flex-1 bg-base-300 overflow-hidden min-h-0">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
