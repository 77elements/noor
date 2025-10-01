/**
 * Convert npub to username
 * Can return plain string OR HTML with links
 */

import { bech32 } from 'bech32';
import { UserProfileService } from '../services/UserProfileService';

export interface Profile {
  name?: string;
  display_name?: string;
  picture?: string;
}

export type ProfileResolver = (hexPubkey: string) => Profile | null;

/**
 * Simple mode: npub → username string
 * @param npub - Single npub string
 * @param asHTML - If true, returns HTML with link. Default: false
 * @returns Username string or HTML link
 */
export function npubToUsername(npub: string, asHTML?: false): string;
export function npubToUsername(npub: string, asHTML: true, profileResolver: ProfileResolver): string;
export function npubToUsername(
  npubOrHtml: string,
  asHTML: boolean | ProfileResolver = false,
  profileResolver?: ProfileResolver
): string {
  // Legacy mode: HTML text processing (when second param is ProfileResolver)
  if (typeof asHTML === 'function') {
    return npubToUsernameHTML(npubOrHtml, asHTML as ProfileResolver);
  }

  // Simple mode: single npub to username
  if (!asHTML) {
    return npubToUsernameSimple(npubOrHtml);
  }

  // HTML mode: single npub to HTML link
  if (profileResolver) {
    return npubToUsernameHTMLSingle(npubOrHtml, profileResolver);
  }

  return npubOrHtml;
}

/**
 * Simple mode: npub → username (no HTML)
 * Returns display name from cache, or FULL npub as fallback
 */
function npubToUsernameSimple(npub: string): string {
  try {
    const hexPubkey = npubToHex(npub);

    // Try to get cached username (synchronous)
    const userProfileService = UserProfileService.getInstance();
    const cachedUsername = userProfileService.getUsername(hexPubkey);

    // If we got a real name (not hex/npub fallback), use it
    // Check if it's NOT the hex pubkey (fallback)
    if (cachedUsername && cachedUsername !== hexPubkey) {
      return cachedUsername;
    }

    // Trigger async profile fetch (fire and forget)
    userProfileService.getUserProfile(hexPubkey).catch(() => {
      // Ignore errors, profile will stay as fallback
    });

    // Fallback to FULL npub (NO SHORTENING!)
    return npub;
  } catch {
    return npub;
  }
}

/**
 * HTML mode: single npub → HTML link with username
 */
function npubToUsernameHTMLSingle(npub: string, profileResolver: ProfileResolver): string {
  try {
    const hexPubkey = npubToHex(npub);
    const profile = profileResolver(hexPubkey);
    const username = profile?.display_name || profile?.name || npub;
    return `<a href="/profile/${npub}">@${username}</a>`;
  } catch {
    return npub;
  }
}

/**
 * Legacy mode: HTML text with multiple npub/nprofile mentions
 */
function npubToUsernameHTML(
  htmlText: string,
  profileResolver: ProfileResolver
): string {
  let text = htmlText;

  // Step 1: Handle nprofile (with or without nostr: prefix)
  // Use capturing groups to get full match
  text = text.replace(/(nostr:)?(nprofile[a-z0-9]+)/gi, (fullMatch, prefix, nprofile) => {
    try {
      const npub = nprofileToNpub(nprofile);
      const hexPubkey = npubToHex(npub);
      const profile = profileResolver(hexPubkey);

      if (profile?.name || profile?.display_name) {
        const username = profile.name || profile.display_name;
        return `<a href="/profile/${npub}">@${username}</a>`;
      } else {
        // Add marker to prevent npub regex from re-matching
        return `<a href="/profile/${npub}" data-mention>${fullMatch}</a>`;
      }
    } catch (error) {
      console.error('npubToUsername: Failed to parse nprofile', error);
      return fullMatch;
    }
  });

  // Step 2: Handle npub (with or without nostr: prefix)
  // BUT skip npubs that are already inside links we created above
  text = text.replace(/(nostr:)?(npub[a-z0-9]+)/gi, (fullMatch, prefix, npub, offset, string) => {
    // Skip invalid/too short npubs (valid npub is at least 59 chars)
    if (npub.length < 59) {
      return fullMatch;
    }

    // Check if this npub is inside a link we already created
    const before = string.substring(Math.max(0, offset - 60), offset);

    // Skip if it's inside href="/profile/..." or has data-mention marker
    if (before.includes('href="/profile/') || before.includes('data-mention')) {
      return fullMatch;
    }

    try {
      const hexPubkey = npubToHex(npub);
      const profile = profileResolver(hexPubkey);

      if (profile?.name || profile?.display_name) {
        const username = profile.name || profile.display_name;
        return `<a href="/profile/${npub}">@${username}</a>`;
      } else {
        return `<a href="/profile/${npub}" data-mention>${fullMatch}</a>`;
      }
    } catch (error) {
      console.error('npubToUsername: Failed to parse npub', error);
      return fullMatch;
    }
  });

  return text;
}

/**
 * Convert nprofile to npub - SIMPLE VERSION
 */
function nprofileToNpub(nprofile: string): string {
  const decoded = bech32.decode(nprofile, 2000); // Increase length limit for long nprofiles
  const dataBytes = convertbits(decoded.words, 5, 8, false);

  // Find pubkey (type 0)
  let i = 0;
  while (i < dataBytes.length) {
    const type = dataBytes[i];
    const length = dataBytes[i + 1];

    if (type === 0 && length === 32) {
      const pubkey = dataBytes.slice(i + 2, i + 2 + length);
      const pubkey5bit = convertbits(pubkey, 8, 5);
      return bech32.encode('npub', pubkey5bit);
    }

    i += 2 + length;
  }

  throw new Error('No pubkey found');
}

/**
 * Convert npub to hex
 */
function npubToHex(npub: string): string {
  const decoded = bech32.decode(npub, 2000); // Increase length limit
  const data = convertbits(decoded.words, 5, 8, false);
  return data.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert bits
 */
function convertbits(data: number[], fromBits: number, toBits: number, pad: boolean = true): number[] {
  let acc = 0;
  let bits = 0;
  const result: number[] = [];
  const maxv = (1 << toBits) - 1;
  const maxAcc = (1 << (fromBits + toBits - 1)) - 1;

  for (const value of data) {
    if (value < 0 || value >> fromBits) {
      throw new Error('Invalid data for base conversion');
    }
    acc = ((acc << fromBits) | value) & maxAcc;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >> bits) & maxv);
    }
  }

  if (pad) {
    if (bits) {
      result.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    throw new Error('Invalid padding in base conversion');
  }

  return result;
}