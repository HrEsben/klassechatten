/**
 * Format a date to Danish locale
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('da-DK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format a date with time to Danish locale
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('da-DK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format a relative time (e.g., "2 timer siden")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'lige nu';
  if (diffInMinutes < 60) return `${diffInMinutes} minut${diffInMinutes > 1 ? 'ter' : ''} siden`;
  if (diffInHours < 24) return `${diffInHours} time${diffInHours > 1 ? 'r' : ''} siden`;
  if (diffInDays < 7) return `${diffInDays} dag${diffInDays > 1 ? 'e' : ''} siden`;

  return formatDate(date);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format user display name
 */
export function formatUserName(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
