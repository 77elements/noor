/**
 * Get relative time string with longer format
 * Single purpose: Unix timestamp → verbose relative time string
 * Used for detailed time displays or tooltips
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Relative time string (e.g., "2 minutes ago", "3 hours ago", "2 days ago")
 *
 * @example
 * getRelativeTime(Date.now() / 1000 - 7200)
 * // => "2 hours ago"
 */

export function getRelativeTime(timestamp: number): string {
  if (!timestamp) return '';

  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) {
    return 'just now';
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else if (diff < 2592000) {
    const days = Math.floor(diff / 86400);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } else {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}