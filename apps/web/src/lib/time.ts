/**
 * Convert a timestamp to relative time in Danish
 * @param timestamp ISO 8601 timestamp
 * @returns Relative time string like "2 min siden", "1 time siden", etc.
 */
export function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Lige nu';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min siden`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 time siden' : `${diffHours} timer siden`;
  } else if (diffDays === 1) {
    return 'I går';
  } else if (diffDays < 7) {
    return `${diffDays} dage siden`;
  } else {
    // For older messages, show actual date
    return past.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short',
    });
  }
}
