/**
 * Content Formatting Utilities
 * Pure utility functions for formatting text content
 * Reusable across the entire application
 */

export interface Mention {
  pubkey: string;
  displayText: string;
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
  };
}

export interface QuotedReference {
  type: 'event' | 'note' | 'addr';
  id: string;
  fullMatch: string;
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Convert URLs to clickable links
 */
export function linkifyUrls(html: string): string {
  const urlRegex = /(https?:\/\/[^\s<]+)/gi;
  return html.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

/**
 * Format mentions as clickable elements
 */
export function formatMentions(html: string, mentions: Mention[]): string {
  mentions.forEach(mention => {
    const displayName = mention.profile?.display_name || mention.profile?.name || mention.displayText;
    html = html.replace(
      new RegExp(mention.displayText, 'g'),
      `<span class="mention" data-pubkey="${mention.pubkey}">@${displayName}</span>`
    );
  });
  return html;
}

/**
 * Format hashtags as clickable elements
 */
export function formatHashtags(html: string, hashtags: string[]): string {
  hashtags.forEach(tag => {
    html = html.replace(
      new RegExp(`#${tag}`, 'g'),
      `<span class="hashtag" data-tag="${tag}">#${tag}</span>`
    );
  });
  return html;
}

/**
 * Format quoted references as placeholder elements
 */
export function formatQuotedReferences(html: string, quotedReferences: QuotedReference[]): string {
  quotedReferences.forEach(ref => {
    // Replace the nostr reference with a placeholder that will be rendered as a quote box
    html = html.replace(
      ref.fullMatch,
      `<div class="quoted-reference" data-type="${ref.type}" data-id="${ref.id}">
        [Quoted ${ref.type}: ${ref.id.slice(0, 8)}...]
       </div>`
    );
  });
  return html;
}

/**
 * Convert line breaks to <br> tags
 */
export function convertLineBreaks(text: string): string {
  return text.replace(/\n/g, '<br>');
}

/**
 * Full content formatting pipeline
 * Applies all formatting transformations in the correct order
 */
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