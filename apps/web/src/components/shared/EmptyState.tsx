/**
 * EmptyState - Shared empty state component
 * Berlin Edgy design with consistent icon + title + description pattern
 */

import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  /** Icon component from lucide-react */
  icon?: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'accent';
  };
  /** Icon color class (default: text-base-content/30) */
  iconColor?: string;
  /** Centered in viewport */
  fullScreen?: boolean;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconColor = 'text-base-content/30',
  fullScreen = false,
}: EmptyStateProps) {
  const containerClass = fullScreen
    ? 'flex flex-col items-center justify-center min-h-screen bg-base-100/80 text-center px-6'
    : 'bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4';

  const getButtonClass = () => {
    switch (action?.variant) {
      case 'secondary':
        return 'btn bg-secondary text-secondary-content hover:bg-secondary/80';
      case 'accent':
        return 'btn bg-accent text-accent-content hover:bg-accent/80';
      default:
        return 'btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content';
    }
  };

  return (
    <div className={containerClass}>
      {Icon && <Icon className={`w-16 h-16 stroke-current ${iconColor} mx-auto mb-4`} strokeWidth={2} />}
      <h2 className="text-2xl font-black uppercase tracking-tight text-base-content mb-2">
        {title}
      </h2>
      {description && <p className="text-base-content/60">{description}</p>}
      {action && (
        <button onClick={action.onClick} className={getButtonClass()}>
          {action.label}
        </button>
      )}
    </div>
  );
}
