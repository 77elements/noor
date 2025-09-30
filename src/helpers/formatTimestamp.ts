/**
 * Format timestamp to human readable format
 * Single purpose: Unix timestamp → readable time string
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted time string (e.g., "now", "5m", "14:35", "Sep 23")
 *
 * @example
 * formatTimestamp(1699999999)
 * // => "14:35" (if today) or "Nov 14" (if not today)
 */

export function formatTimestamp(timestamp: number): string {
  if (!timestamp) return '';

  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 3600) {
    // Less than 1 hour - show relative time
    const minutes = Math.floor(diff / 60);
    return minutes <= 1 ? 'now' : `${minutes}m`;
  } else {
    // More than 1 hour - show absolute time
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }
}