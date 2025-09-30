/**
 * Extract npub mentions from text content
 * Single purpose: text → string[] (raw npub strings)
 * Note: Profile resolution should be handled separately by calling code
 *
 * @param text - Raw text content to extract npub mentions from
 * @returns Array of npub strings (npub1...)
 *
 * @example
 * extractNpubMentions("Follow npub1abc... for updates")
 * // => ['npub1abc...']
 */

export function extractNpubMentions(text: string): string[] {
  const npubRegex = /npub1[a-z0-9]{58}/gi;
  return text.match(npubRegex) || [];
}