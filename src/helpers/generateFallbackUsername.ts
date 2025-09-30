/**
 * Generate fallback username from pubkey
 * Single purpose: pubkey → shortened display name
 */

import { shortenPubkey } from './shortenPubkey';

export function generateFallbackUsername(pubkey: string): string {
  return shortenPubkey(pubkey);
}