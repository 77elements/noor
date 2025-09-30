/**
 * Convert npub to hex pubkey
 * Single purpose: npub1... → hex string
 */

import { nip19 } from 'nostr-tools';

export function npubToHex(npub: string): string | null {
  try {
    const decoded = nip19.decode(npub);
    if (decoded.type === 'npub') {
      return decoded.data as string;
    }
    return null;
  } catch (error) {
    console.warn('Failed to decode npub:', npub, error);
    return null;
  }
}