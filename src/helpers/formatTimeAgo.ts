/**
 * Format timestamp for time ago display
 * Single purpose: Unix timestamp → time ago string
 * Alias for formatTimestamp for backwards compatibility and semantic clarity
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted time string
 *
 * @example
 * formatTimeAgo(Date.now() / 1000 - 120)
 * // => "2m"
 */

import { formatTimestamp } from './formatTimestamp';

export function formatTimeAgo(timestamp: number): string {
  return formatTimestamp(timestamp);
}