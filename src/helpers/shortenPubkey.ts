/**
 * Shorten pubkey for display
 * Single purpose: abc123...xyz789 → abc12...xyz7
 */

export function shortenPubkey(pubkey: string): string {
  if (!pubkey || pubkey.length < 12) return pubkey;
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
}