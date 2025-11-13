'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';

function AdminClassesContent() {
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
            Klasseadministration
          </h1>
          <div className="h-1 w-24 bg-primary mt-2"></div>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-16 h-16 stroke-current text-secondary mx-auto" strokeWidth={2}>
          <path strokeLinecap="square" strokeLinejoin="miter" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
          Kommer snart
        </h2>
        <p className="text-base-content/60">Klasseadministration er under udvikling</p>
      </div>
    </div>
  );
}

export default function AdminClassesPage() {
  return (
    <AdminLayout>
      <AdminClassesContent />
    </AdminLayout>
  );
}
