'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';

function AdminModerationContent() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost btn-square"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-6 h-6 stroke-current" strokeWidth={2}>
            <path strokeLinecap="square" strokeLinejoin="miter" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content">
            Moderation
          </h1>
          <div className="h-1 w-24 bg-primary mt-2"></div>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-16 h-16 stroke-current text-warning mx-auto" strokeWidth={2}>
          <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
          Kommer snart
        </h2>
        <p className="text-base-content/60">Moderationspanel med rapporter og flagging er under udvikling</p>
      </div>
    </div>
  );
}

export default function AdminModerationPage() {
  return (
    <AdminLayout>
      <AdminModerationContent />
    </AdminLayout>
  );
}
