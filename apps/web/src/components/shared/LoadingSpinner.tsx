/**
 * LoadingSpinner - Shared loading state component
 * Berlin Edgy design with consistent styling
 */

interface LoadingSpinnerProps {
  /** Text to display below spinner */
  text?: string;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Full height container (min-h-[60vh]) */
  fullHeight?: boolean;
  /** Center in viewport (min-h-screen) */
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  text = 'Indlæser...',
  size = 'lg',
  fullHeight = false,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const containerClass = fullScreen
    ? 'flex justify-center items-center min-h-screen'
    : fullHeight
    ? 'flex justify-center items-center min-h-[60vh]'
    : 'flex justify-center items-center';

  const spinnerSizeClass = `loading-${size}`;

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4">
        <span className={`loading loading-ball ${spinnerSizeClass} text-primary`}></span>
        {text && <p className="text-base-content/60 font-medium">{text}</p>}
      </div>
    </div>
  );
}
