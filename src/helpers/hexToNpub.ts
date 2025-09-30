/**
 * Convert hex pubkey to npub
 * Single purpose: hex string → npub1...
 */

import { nip19 } from 'nostr-tools';

export function hexToNpub(hex: string): string | null {
  try {
    return nip19.npubEncode(hex);
  } catch (error) {
    console.warn('Failed to encode hex to npub:', hex, error);
    return null;
  }
}