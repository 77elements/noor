/**
 * Time and Date Helper Functions
 * Reusable utilities for formatting timestamps across the application
 */

/**
 * Format timestamp to human readable format
 * Used across NoteHeader, NoteNesting, and other components
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted time string (e.g., "now", "5m", "14:35", "Sep 23")
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

/**
 * Format timestamp for time ago display (alias for formatTimestamp)
 * Used in NoteHeader component for consistency
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted time string
 */
export function formatTimeAgo(timestamp: number): string {
  return formatTimestamp(timestamp);
}

/**
 * Get relative time string with longer format
 * Used for detailed time displays or tooltips
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Relative time string (e.g., "2 minutes ago", "3 hours ago", "2 days ago")
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