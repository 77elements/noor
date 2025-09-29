/**
 * HTML Rendering Utilities
 * Pure functions for rendering structured content to HTML strings
 * Reusable across the entire application (timeline, profiles, DMs, comments, etc.)
 */

import type { ProcessedNote } from '../components/content/NoteContentProcessing';

/**
 * Render media content (images, videos)
 */
export function renderMediaContent(media: ProcessedNote['content']['media']): string {
  if (media.length === 0) return '';

  const mediaHtml = media.map(item => {
    switch (item.type) {
      case 'image':
        return `<img src="${item.url}" alt="${item.alt || ''}" class="note-image" loading="lazy">`;
      case 'video':
        if (item.thumbnail) {
          // YouTube or video with thumbnail
          return `
            <div class="note-video">
              <img src="${item.thumbnail}" alt="Video thumbnail" class="video-thumbnail">
              <a href="${item.url}" target="_blank" class="video-link">▶️ Watch Video</a>
            </div>
          `;
        } else {
          return `<video src="${item.url}" controls class="note-video" preload="metadata"></video>`;
        }
      default:
        return '';
    }
  }).join('');

  return `<div class="note-media">${mediaHtml}</div>`;
}

/**
 * Render quoted references placeholder
 * Note: This creates placeholder HTML. Actual quoted notes are rendered
 * dynamically via renderQuotedNotes() in NoteUI after DOM creation.
 */
export function renderQuotedReferencesPlaceholder(quotedReferences: ProcessedNote['content']['quotedReferences']): string {
  if (quotedReferences.length === 0) return '';

  const quotesHtml = quotedReferences.map(ref => {
    // Placeholder that will be replaced with actual fetched content
    return `
      <div class="quoted-note-container">
        <div class="quoted-note-header">
          <span class="quote-icon">💬</span>
          <span class="quote-type">Quoted ${ref.type}</span>
        </div>
        <div class="quoted-note-content">
          <div class="quoted-note-placeholder">
            <p><em>Loading quoted content...</em></p>
            <small>ID: ${ref.id.slice(0, 12)}...</small>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="note-quotes">${quotesHtml}</div>`;
}

/**
 * Render complete note content HTML
 * Convenience function that combines all rendering utilities
 */
export function renderNoteContent(content: ProcessedNote['content']): string {
  return `
    ${content.html}
    ${renderMediaContent(content.media)}
    ${renderQuotedReferencesPlaceholder(content.quotedReferences)}
  `;
}