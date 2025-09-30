/**
 * Full content formatting pipeline
 * Applies all formatting transformations in the correct order
 * This is a composition helper that uses other single-purpose helpers
 *
 * @param text - Raw text content
 * @param mentions - Array of Mention objects
 * @param hashtags - Array of hashtag strings
 * @param quotedReferences - Array of QuotedReference objects
 * @returns Fully formatted HTML
 *
 * @example
 * formatContent("Hello #nostr https://example.com", [], ['nostr'], [])
 * // => Escaped, linkified, hashtag-formatted, line-broken HTML
 */

import { escapeHtml } from './escapeHtml';
import { linkifyUrls } from './linkifyUrls';
import { formatMentions, type Mention } from './formatMentions';
import { formatHashtags } from './formatHashtags';
import { formatQuotedReferences, type QuotedReference } from './formatQuotedReferences';
import { convertLineBreaks } from './convertLineBreaks';

export function formatContent(
  text: string,
  mentions: Mention[],
  hashtags: string[],
  quotedReferences: QuotedReference[]
): string {
  let html = escapeHtml(text);
  html = linkifyUrls(html);
  html = formatMentions(html, mentions);
  html = formatHashtags(html, hashtags);
  html = formatQuotedReferences(html, quotedReferences);
  html = convertLineBreaks(html);
  return html;
}

// Re-export types for convenience
export type { Mention, QuotedReference };