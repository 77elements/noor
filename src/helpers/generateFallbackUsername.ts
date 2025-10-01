/**
 * Generate fallback username from pubkey
 * Single purpose: pubkey → full pubkey (NO SHORTENING!)
 */

export function generateFallbackUsername(pubkey: string): string {
  return pubkey;
}