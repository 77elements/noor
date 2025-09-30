/**
 * Format mentions as clickable elements
 * Single purpose: HTML + Mention[] → HTML with formatted mentions
 *
 * @param html - HTML content
 * @param mentions - Array of Mention objects with profile data
 * @returns HTML with mentions replaced by styled spans
 *
 * @example
 * formatMentions(html, [{ pubkey: 'abc', displayText: 'npub1abc...', profile: {...} }])
 * // => HTML with <span class="mention" data-pubkey="abc">@username</span>
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