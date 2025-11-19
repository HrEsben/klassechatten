'use client';

import { useEffect, useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting: boolean;
  showWhenConnected?: boolean; // Whether to show status when connected
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; // Position of the indicator
}

/**
 * Subtle connection status indicator using DaisyUI badge
 * Shows a small badge indicator when disconnected or reconnecting
 * Auto-hides after reconnection
 */
export function ConnectionStatus({
  isConnected,
  isReconnecting,
  showWhenConnected = false,
  position = 'top-right',
}: ConnectionStatusProps) {
  const [showConnected, setShowConnected] = useState(false);
  const [hasEverConnected, setHasEverConnected] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setHasEverConnected(true);
      
      // Show connected status briefly when reconnecting
      if (isReconnecting || !hasEverConnected) {
        setShowConnected(true);
        const timer = setTimeout(() => {
          setShowConnected(false);
        }, 2000); // Hide after 2 seconds
        return () => clearTimeout(timer);
      }
    }
  }, [isConnected, isReconnecting, hasEverConnected]);

  // Don't show anything if connected and we're not reconnecting
  if (isConnected && !showConnected && !showWhenConnected) {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }[position];

  return (
    <div
      className={`fixed ${positionClasses} z-50 transition-opacity duration-300 ${
        isConnected && !showConnected ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      {isReconnecting ? (
        <div className="badge badge-warning gap-2 px-3 py-3">
          <span className="loading loading-spinner loading-xs"></span>
          <span className="text-sm">Genforbinder...</span>
        </div>
      ) : isConnected && showConnected ? (
        <div className="badge badge-success gap-2 px-3 py-3">
          <Check className="h-4 w-4" strokeWidth={2} />
          <span className="text-sm">Tilsluttet</span>
        </div>
      ) : (
        <div className="badge badge-error gap-2 px-3 py-3">
          <AlertCircle className="h-4 w-4" strokeWidth={2} />
          <span className="text-sm">Forbindelse mistet</span>
        </div>
      )}
    </div>
  );
}
