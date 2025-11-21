'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Alert component for persistent inline notifications
 * 
 * Features:
 * - 4 variants: info (default), success, warning, error
 * - Optional title and icon
 * - Dismissible with close button
 * - Berlin Edgy design (sharp corners, border-2)
 * - DaisyUI alert classes with custom overrides
 * 
 * Usage:
 * ```tsx
 * <Alert variant="success" title="Success!">
 *   Your changes have been saved.
 * </Alert>
 * 
 * <Alert variant="warning" dismissible onDismiss={() => console.log('dismissed')}>
 *   This action cannot be undone.
 * </Alert>
 * ```
 */
export function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
  className = '',
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const variantClasses = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error',
  };

  return (
    <div
      role="alert"
      className={`alert ${variantClasses[variant]} border-2 ${className}`}
    >
      {icon && <div className="shrink-0">{icon}</div>}
      
      <div className="flex-1">
        {title && (
          <h3 className="font-black uppercase tracking-tight text-base mb-1">
            {title}
          </h3>
        )}
        <div className="text-sm">{children}</div>
      </div>

      {dismissible && (
        <button
          onClick={handleDismiss}
          className="btn btn-ghost btn-square btn-sm"
          aria-label="Luk advarsel"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
