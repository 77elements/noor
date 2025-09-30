/**
 * Generate fallback avatar URL
 * Single purpose: pubkey → DiceBear avatar URL
 */

export function generateFallbackAvatar(pubkey: string): string {
  if (!pubkey) return '';
  const seed = pubkey.slice(0, 16);
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}&backgroundColor=transparent`;
}