import React from 'react';
import { School, Users, MessageSquare, AlertTriangle, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ClassCardProps {
  classData: {
    id: string;
    label: string;
    nickname?: string | null;
    grade_level?: number;
    school_name?: string;
    invite_code?: string;
  };
  /** Stats to display */
  stats?: {
    memberCount?: number;
    roomCount?: number;
    messageCount?: number;
    flaggedCount?: number;
  };
  /** Show stats section */
  showStats?: boolean;
  /** Show invite code */
  showInviteCode?: boolean;
  /** Click handler for the card */
  onClick?: () => void;
  /** Additional actions */
  actions?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * ClassCard - Consistent class display component
 * 
 * @example
 * // Simple class card
 * <ClassCard
 *   classData={{
 *     id: "123",
 *     label: "5A",
 *     nickname: "De Vilde 5'ere",
 *     grade_level: 5,
 *     school_name: "Skovgårdsskolen"
 *   }}
 *   onClick={() => router.push(`/admin/classes/${classData.id}`)}
 * />
 * 
 * @example
 * // With stats
 * <ClassCard
 *   classData={classData}
 *   showStats
 *   stats={{
 *     memberCount: 25,
 *     roomCount: 3,
 *     messageCount: 1540,
 *     flaggedCount: 2
 *   }}
 * />
 * 
 * @example
 * // With invite code
 * <ClassCard
 *   classData={classData}
 *   showInviteCode
 * />
 */
export function ClassCard({
  classData,
  stats,
  showStats = false,
  showInviteCode = false,
  onClick,
  actions,
  className = '',
}: ClassCardProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopyInviteCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (classData.invite_code) {
      try {
        await navigator.clipboard.writeText(classData.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const isClickable = !!onClick;

  const containerClass = `card bg-base-100 border-2 border-base-content/10 shadow-lg ${
    isClickable ? 'hover:border-primary/50 cursor-pointer transition-all duration-200' : ''
  } ${className}`;

  const content = (
    <>
      {/* Header */}
      <div className="card-body space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="card-title text-2xl font-black uppercase tracking-tight text-base-content">
              {classData.nickname || classData.label}
            </h2>
            {classData.school_name && classData.grade_level && (
              <p className="text-xs font-mono uppercase tracking-wider text-base-content/50 mt-1">
                {classData.school_name} • {classData.grade_level}. klasse
              </p>
            )}
          </div>
          {actions && (
            <div className="card-actions flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>

        {/* Invite Code */}
        {showInviteCode && classData.invite_code && (
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs font-mono uppercase tracking-wider text-base-content/50">
              Invite Code:
            </span>
            <code className="px-2 py-1 bg-base-200 border-2 border-base-content/10 text-sm font-mono text-base-content">
              {classData.invite_code}
            </code>
            <button
              onClick={handleCopyInviteCode}
              className="btn btn-xs btn-ghost"
              aria-label="Kopiér invite code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-success" strokeWidth={2} />
              ) : (
                <Copy className="w-4 h-4" strokeWidth={2} />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {showStats && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-6 pb-6 border-t-2 border-base-content/10">
          {stats.memberCount !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 stroke-current text-primary" strokeWidth={2} />
                <span className="text-xl font-black text-base-content">{stats.memberCount}</span>
              </div>
              <div className="text-xs font-black uppercase tracking-tight text-base-content/60">
                Medlemmer
              </div>
            </div>
          )}

          {stats.roomCount !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 stroke-current text-secondary" strokeWidth={2} />
                <span className="text-xl font-black text-base-content">{stats.roomCount}</span>
              </div>
              <div className="text-xs font-black uppercase tracking-tight text-base-content/60">
                Rum
              </div>
            </div>
          )}

          {stats.messageCount !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 stroke-current text-accent" strokeWidth={2} />
                <span className="text-xl font-black text-base-content">{stats.messageCount}</span>
              </div>
              <div className="text-xs font-black uppercase tracking-tight text-base-content/60">
                Beskeder
              </div>
            </div>
          )}

          {stats.flaggedCount !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 stroke-current text-warning" strokeWidth={2} />
                <span className="text-xl font-black text-base-content">{stats.flaggedCount}</span>
              </div>
              <div className="text-xs font-black uppercase tracking-tight text-base-content/60">
                Flaggede
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (isClickable) {
    return (
      <button onClick={onClick} className={containerClass} type="button">
        {content}
      </button>
    );
  }

  return <div className={containerClass}>{content}</div>;
}
