/**
 * NoteNesting Component
 * Handles recursive note nesting with level-based display rules
 * Level 0: Full content, Level 1-4: Truncated, Level 5+: "More..." link
 */

import type { Event as NostrEvent } from 'nostr-tools';
import { NoteContentProcessing, ProcessedNote } from '../content/NoteContentProcessing';

export class NoteNesting {
  private static noteProcessor: NoteContentProcessing = NoteContentProcessing.getInstance();
  private static readonly MAX_DISPLAY_LEVEL = 4;
  private static readonly TRUNCATE_LENGTH = 200;

  /**
   * Create nested note with level-based display rules
   */
  static async createNestedNote(event: NostrEvent, level: number = 0): Promise<HTMLElement> {
    // Level 5+ shows "Click here for more..." link
    if (level > NoteNesting.MAX_DISPLAY_LEVEL) {
      return NoteNesting.createMoreLink(event, level);
    }

    try {
      // Process the note for content
      const processedNote = await NoteNesting.noteProcessor.processNote(event);

      // Level 0 gets full content, Level 1-4 get truncated
      if (level === 0) {
        return NoteNesting.createFullNote(processedNote, level);
      } else {
        return NoteNesting.createTruncatedNote(processedNote, level);
      }
    } catch (error) {
      console.error('❌ Error processing nested note:', event.id, error);
      return NoteNesting.createErrorNote(event, level);
    }
  }

  /**
   * Create full note display (Level 0)
   */
  private static createFullNote(note: ProcessedNote, level: number): HTMLElement {
    const noteDiv = document.createElement('div');
    noteDiv.className = `nested-note nested-note-level-${level}`;
    noteDiv.dataset.eventId = note.id;
    noteDiv.dataset.level = level.toString();

    // Author info
    const authorName = note.author?.profile?.display_name ||
                      note.author?.profile?.name ||
                      note.author?.pubkey.slice(0, 8) || 'Unknown';

    const authorPicture = note.author?.profile?.picture || '';

    // Full note content
    noteDiv.innerHTML = `
      <div class="note-header">
        <div class="author-info">
          <img src="${authorPicture}"
               alt="${authorName}"
               class="author-avatar"
               onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${note.author?.pubkey || 'default'}'">
          <div class="author-details">
            <span class="author-name">${authorName}</span>
            <span class="note-time">${note.formattedTime}</span>
          </div>
        </div>
      </div>
      <div class="note-content">
        ${note.content.html}
      </div>
      ${NoteNesting.renderMediaContent(note.content.media)}
      ${NoteNesting.renderLinks(note.content.links)}
    `;

    // Handle nested quotes recursively
    NoteNesting.appendNestedNotes(noteDiv, note, level);

    return noteDiv;
  }

  /**
   * Create truncated note display (Level 1-4)
   */
  private static createTruncatedNote(note: ProcessedNote, level: number): HTMLElement {
    const noteDiv = document.createElement('div');
    noteDiv.className = `nested-note nested-note-level-${level} nested-note-truncated`;
    noteDiv.dataset.eventId = note.id;
    noteDiv.dataset.level = level.toString();

    // Author info
    const authorName = note.author?.profile?.display_name ||
                      note.author?.profile?.name ||
                      note.author?.pubkey.slice(0, 8) || 'Unknown';

    const authorPicture = note.author?.profile?.picture || '';

    // Truncate content to 200 characters
    const truncatedContent = NoteNesting.truncateContent(note.content.text);

    // Truncated note content with click handler
    noteDiv.innerHTML = `
      <div class="note-header">
        <div class="author-info">
          <img src="${authorPicture}"
               alt="${authorName}"
               class="author-avatar author-avatar-small"
               onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${note.author?.pubkey || 'default'}'">
          <div class="author-details">
            <span class="author-name">${authorName}</span>
            <span class="note-time">${note.formattedTime}</span>
          </div>
        </div>
      </div>
      <div class="note-content note-content-truncated">
        ${truncatedContent}
      </div>
    `;

    // Make truncated note clickable for future single-note view
    noteDiv.style.cursor = 'pointer';
    noteDiv.title = 'Click to view full note';
    noteDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('TODO: Open single note view for:', note.id);
      // TODO: Implement single note view navigation
    });

    // Handle nested notes recursively
    NoteNesting.appendNestedNotes(noteDiv, note, level);

    return noteDiv;
  }

  /**
   * Create "Click here for more..." link (Level 5+)
   */
  private static createMoreLink(event: NostrEvent, level: number): HTMLElement {
    const linkDiv = document.createElement('div');
    linkDiv.className = `nested-note nested-note-more-link`;
    linkDiv.dataset.eventId = event.id;
    linkDiv.dataset.level = level.toString();

    linkDiv.innerHTML = `
      <div class="note-more-content">
        <span class="more-icon">📄</span>
        <span class="more-text">Click here for more... (${level - NoteNesting.MAX_DISPLAY_LEVEL} more levels)</span>
      </div>
    `;

    // Make link clickable
    linkDiv.style.cursor = 'pointer';
    linkDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('TODO: Navigate to note with full context:', event.id);
      // TODO: Implement navigation to note with full 5-level context
    });

    return linkDiv;
  }

  /**
   * Create error note fallback
   */
  private static createErrorNote(event: NostrEvent, level: number): HTMLElement {
    const errorDiv = document.createElement('div');
    errorDiv.className = `nested-note nested-note-level-${level} nested-note-error`;
    errorDiv.dataset.eventId = event.id;
    errorDiv.dataset.level = level.toString();

    errorDiv.innerHTML = `
      <div class="note-error">
        <span class="error-icon">⚠️</span>
        <span class="error-message">Nested note can't be rendered</span>
        <small>Level ${level} | ID: ${event.id.slice(0, 8)}...</small>
      </div>
    `;

    return errorDiv;
  }

  /**
   * Append nested notes recursively
   */
  private static async appendNestedNotes(container: HTMLElement, note: ProcessedNote, currentLevel: number): Promise<void> {
    if (note.content.quotedReferences && note.content.quotedReferences.length > 0) {
      const nestingContainer = document.createElement('div');
      nestingContainer.className = 'nested-notes';

      for (const nestedRef of note.content.quotedReferences) {
        // TODO: Fetch actual nested event from relay
        // For now, create placeholder
        const nestedEvent = NoteNesting.createPlaceholderEvent(nestedRef);
        const nestedElement = await NoteNesting.createNestedNote(nestedEvent, currentLevel + 1);
        nestingContainer.appendChild(nestedElement);
      }

      container.appendChild(nestingContainer);
    }
  }

  /**
   * Truncate content to specified length
   */
  private static truncateContent(content: string): string {
    if (content.length <= NoteNesting.TRUNCATE_LENGTH) {
      return content;
    }

    const truncated = content.slice(0, NoteNesting.TRUNCATE_LENGTH);
    const lastSpace = truncated.lastIndexOf(' ');

    // Truncate at last word boundary if possible
    const finalContent = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
    return finalContent + '...';
  }

  /**
   * Create placeholder event for nested references
   * TODO: Replace with actual event fetching from relay
   */
  private static createPlaceholderEvent(nestedRef: any): NostrEvent {
    return {
      id: nestedRef.id,
      pubkey: 'placeholder-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: `Loading nested note... (${nestedRef.id.slice(0, 12)}...)`,
      sig: 'placeholder-sig'
    };
  }

  /**
   * Render media content for nested notes
   */
  private static renderMediaContent(media: ProcessedNote['content']['media']): string {
    if (media.length === 0) return '';

    const mediaHtml = media.map(item => {
      switch (item.type) {
        case 'image':
          return `<img src="${item.url}" alt="${item.alt || ''}" class="nested-note-image" loading="lazy">`;
        case 'video':
          return `<div class="nested-note-video">🎥 Video: ${item.url}</div>`;
        default:
          return '';
      }
    }).join('');

    return `<div class="nested-note-media">${mediaHtml}</div>`;
  }

  /**
   * Render links for nested notes
   */
  private static renderLinks(links: ProcessedNote['content']['links']): string {
    if (links.length === 0) return '';

    const linksHtml = links.map(link => `
      <div class="nested-note-link">
        <a href="${link.url}" target="_blank" rel="noopener">
          🔗 ${link.title || link.domain}
        </a>
      </div>
    `).join('');

    return `<div class="nested-note-links">${linksHtml}</div>`;
  }
}