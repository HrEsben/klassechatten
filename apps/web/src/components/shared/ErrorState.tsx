/**
 * ErrorState - Shared error state component
 * Berlin Edgy design with consistent error display
 */

import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  /** Error message */
  message: string;
  /** Optional title (default: "Fejl") */
  title?: string;
  /** Optional retry action */
  onRetry?: () => void;
  /** Centered in viewport */
  fullScreen?: boolean;
  /** Full height container */
  fullHeight?: boolean;
}

export default function ErrorState({
  message,
  title = 'Fejl',
  onRetry,
  fullScreen = false,
  fullHeight = false,
}: ErrorStateProps) {
  const containerClass = fullScreen
    ? 'flex justify-center items-center min-h-screen'
    : fullHeight
    ? 'flex justify-center items-center min-h-[60vh]'
    : 'flex justify-center items-center';

  return (
    <div className={containerClass}>
      <div className="text-center space-y-4 max-w-md">
        <div className="bg-error/10 border-2 border-error/20 px-6 py-8 space-y-4">
          <AlertCircle className="w-16 h-16 stroke-current text-error mx-auto" strokeWidth={2} />
          <h2 className="text-xl font-black uppercase tracking-tight text-error">
            {title}
          </h2>
          <p className="text-sm text-base-content/70">{message}</p>
        </div>
        {onRetry && (
          <button onClick={onRetry} className="btn btn-ghost">
            Prøv igen
          </button>
        )}
      </div>
    </div>
  );
}
