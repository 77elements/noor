/**
 * Render complete note content HTML
 * Single purpose: ProcessedNote content → complete HTML string
 * Convenience composition helper that combines all rendering utilities
 *
 * @param content - Processed note content object
 * @returns Complete HTML string for note rendering
 *
 * @example
 * renderNoteContent({ html: '...', media: [...], quotedReferences: [...] })
 * // => Complete HTML with text, media, and quoted references
 */

import { renderMediaContent, type MediaContent } from './renderMediaContent';
import { renderQuotedReferencesPlaceholder, type QuotedReference } from './renderQuotedReferencesPlaceholder';

export interface ProcessedNoteContent {
  html: string;
  media: MediaContent[];
  quotedReferences: QuotedReference[];
}

export function renderNoteContent(content: ProcessedNoteContent): string {
  return `
    ${content.html}
    ${renderMediaContent(content.media)}
    ${renderQuotedReferencesPlaceholder(content.quotedReferences)}
  `;
}

// Re-export types for convenience
export type { MediaContent, QuotedReference };