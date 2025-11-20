'use client';

import { useRouter } from 'next/navigation';
import { useAdminClasses } from '@/hooks/useAdminClasses';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { useState } from 'react';
import { School } from 'lucide-react';
import { LoadingSpinner, ErrorState, EmptyState, Modal } from '@/components/shared';

function AdminClassesContent() {
  const router = useRouter();
  const { classes, stats, loading, error, deleteClass } = useAdminClasses();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    setDeleting(true);
    const result = await deleteClass(deleteConfirm);
    setDeleting(false);
    setDeleteConfirm(null);

    if (!result.success) {
      alert(`Fejl ved sletning af klasse: ${result.error}`);
    }
  };

  if (loading) {
    return <LoadingSpinner fullHeight text="Indlæser klasser..." />;
  }

  if (error) {
    return <ErrorState message={error} title="Fejl ved indlæsning af klasser" fullHeight />;
  }

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

      {/* Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow-lg w-full bg-base-100 border-2 border-base-content/10">
        <div className="stat">
          <div className="stat-title text-xs font-bold uppercase tracking-widest text-base-content/50">
            Klasser
          </div>
          <div className="stat-value text-primary">{stats.totalClasses}</div>
        </div>
        
        <div className="stat">
          <div className="stat-title text-xs font-bold uppercase tracking-widest text-base-content/50">
            Elever
          </div>
          <div className="stat-value text-info">{stats.totalStudents}</div>
        </div>
        
        <div className="stat">
          <div className="stat-title text-xs font-bold uppercase tracking-widest text-base-content/50">
            Lærere
          </div>
          <div className="stat-value text-accent">{stats.totalTeachers}</div>
        </div>
        
        <div className="stat">
          <div className="stat-title text-xs font-bold uppercase tracking-widest text-base-content/50">
            Rum
          </div>
          <div className="stat-value text-secondary">{stats.totalRooms}</div>
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
        <div className="p-6 border-b-2 border-base-content/10 flex items-center justify-between">
          <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
            Alle Klasser
          </h2>
          <span className="text-xs font-mono uppercase tracking-wider text-base-content/50">
            {classes.length} klasser
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr className="border-b-2 border-base-content/10">
                <th className="text-xs font-black uppercase tracking-widest">Klasse</th>
                <th className="text-xs font-black uppercase tracking-widest">Skole</th>
                <th className="text-xs font-black uppercase tracking-widest">Elever</th>
                <th className="text-xs font-black uppercase tracking-widest">Lærere</th>
                <th className="text-xs font-black uppercase tracking-widest">Forældre</th>
                <th className="text-xs font-black uppercase tracking-widest">Rum</th>
                <th className="text-xs font-black uppercase tracking-widest">Invite Kode</th>
                <th className="text-xs font-black uppercase tracking-widest">Oprettet</th>
                <th className="text-xs font-black uppercase tracking-widest">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr 
                  key={cls.id} 
                  className="hover:bg-base-200 cursor-pointer"
                  onClick={() => router.push(`/admin/classes/${cls.id}`)}
                >
                  <td>
                    <span className="font-bold text-base-content">{cls.label}</span>
                  </td>
                  <td>
                    <span className="text-xs text-base-content/60">
                      {cls.school_name || 'Ingen skole'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-info badge-sm font-bold">
                      {cls.student_count}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-accent badge-sm font-bold">
                      {cls.teacher_count}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-secondary badge-sm font-bold">
                      {cls.parent_count}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-primary badge-sm font-bold">
                      {cls.room_count}
                    </span>
                  </td>
                  <td>
                    <code className="text-xs font-mono uppercase tracking-wider text-base-content/80 bg-base-200 px-2 py-1">
                      {cls.invite_code}
                    </code>
                  </td>
                  <td>
                    <span className="text-xs text-base-content/60">
                      {format(new Date(cls.created_at), 'd. MMM yyyy', { locale: da })}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(cls.id);
                      }}
                      disabled={deleting}
                      className="btn btn-xs btn-ghost text-error"
                    >
                      Slet
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {classes.length === 0 && (
          <EmptyState
            icon={School}
            title="Ingen klasser"
            description="Der er endnu ikke oprettet nogen klasser"
          />
        )}
      </div>

      {/* Delete Class Confirmation Modal */}
      <Modal
        id="delete-class-modal"
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Slet klasse"
        size="sm"
        actions={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
            >
              Annuller
            </button>
            <button
              className="btn bg-error text-error-content hover:bg-error/80"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                'Ja, slet klasse'
              )}
            </button>
          </>
        }
      >
        <p className="text-base-content/80">
          Er du sikker på, at du vil slette denne klasse? Alle medlemmer, rum og beskeder vil blive fjernet. 
          Denne handling kan ikke fortrydes.
        </p>
      </Modal>
    </div>
  );
}

export default function AdminClassesPage() {
  return <AdminClassesContent />;
}
