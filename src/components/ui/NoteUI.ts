/**
 * NoteUI Component
 * Single responsibility: Assemble HTML for one note
 * Takes ProcessedNote input, outputs HTMLElement
 */

import type { Event as NostrEvent } from 'nostr-tools';
import { NoteContentProcessing, ProcessedNote } from '../content/NoteContentProcessing';
import { NoteHeader } from './NoteHeader';
import { NoteNesting } from './NoteNesting';

export class NoteUI {
  private static noteHeaders: Map<string, NoteHeader> = new Map();
  private static noteProcessor: NoteContentProcessing = NoteContentProcessing.getInstance();

  /**
   * Create HTML element for any nostr event (processes content internally)
   */
  static async createNoteElement(event: NostrEvent, index?: number): Promise<HTMLElement> {
    try {
      // Process the event internally
      const note = await NoteUI.noteProcessor.processNote(event);

      switch (note.type) {
        case 'repost':
          return NoteUI.createRepostElement(note);
        case 'quote':
          return await NoteUI.createQuoteElement(note);
        default:
          return NoteUI.createOriginalNoteElement(note);
      }
    } catch (error) {
      console.error('❌ Error processing note:', event.id, error);
      return NoteUI.createErrorNoteElement(event, error);
    }
  }

  /**
   * Create fallback element when note processing fails
   */
  private static createErrorNoteElement(event: NostrEvent, error: any): HTMLElement {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'timeline-event timeline-error';
    errorDiv.dataset.eventId = event.id;

    errorDiv.innerHTML = `
      <div class="note-error">
        <div class="error-header">
          <span class="error-icon">⚠️</span>
          <span class="error-message">Note can't be rendered</span>
        </div>
        <div class="error-details">
          <small>ID: ${event.id.slice(0, 12)}... | Kind: ${event.kind}</small>
        </div>
      </div>
    `;

    return errorDiv;
  }

  /**
   * Create repost element with "User reposted" display
   */
  private static createRepostElement(note: ProcessedNote): HTMLElement {
    const repostDiv = document.createElement('div');
    repostDiv.className = 'timeline-event timeline-repost';
    repostDiv.dataset.eventId = note.id;

    // Repost header showing who reposted
    const reposterName = note.reposter?.profile?.display_name ||
                        note.reposter?.profile?.name ||
                        note.reposter?.pubkey.slice(0, 8) || 'Unknown';

    const repostHeader = document.createElement('div');
    repostHeader.className = 'repost-header';
    repostHeader.innerHTML = `
      <span class="repost-icon">🔄</span>
      <span class="reposter-name">${reposterName} reposted</span>
    `;

    // Original note content with original author
    const originalNoteElement = NoteUI.createOriginalNoteElement(note);

    repostDiv.appendChild(repostHeader);
    repostDiv.appendChild(originalNoteElement);

    return repostDiv;
  }

  /**
   * Create quote element with nested content using NoteNesting
   */
  private static async createQuoteElement(note: ProcessedNote): Promise<HTMLElement> {
    // Use NoteNesting for recursive quote display
    // Convert ProcessedNote back to NostrEvent for NoteNesting
    const event = note.rawEvent;
    return await NoteNesting.createNestedNote(event, 0);
  }

  /**
   * Create original note element
   */
  private static createOriginalNoteElement(note: ProcessedNote): HTMLElement {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'timeline-event timeline-original';
    noteDiv.dataset.eventId = note.id;

    // Create note header component
    const noteHeader = new NoteHeader({
      pubkey: note.author.pubkey,
      timestamp: note.timestamp,
      size: 'medium',
      showVerification: true,
      showTimestamp: true,
      onClick: (pubkey: string) => {
        console.log('Profile clicked:', pubkey);
      }
    });

    // Store reference for cleanup
    NoteUI.noteHeaders.set(note.id, noteHeader);

    // Check for long content
    const hasLong = NoteUI.hasLongContent(note.content.text);
    const contentClass = hasLong ? 'event-content has-long-content' : 'event-content';

    // Create note structure with processed content
    noteDiv.innerHTML = `
      <div class="event-header-container">
        <!-- Note header will be inserted here -->
      </div>
      <div class="${contentClass}">
        ${note.content.html}
      </div>
      ${NoteUI.renderMediaContent(note.content.media)}
      ${NoteUI.renderLinks(note.content.links)}
      ${NoteUI.renderQuotedReferences(note.content.quotedReferences)}
      <div class="event-footer">
        <span class="event-kind">Kind ${note.rawEvent.kind}</span>
        <span class="event-id">${note.id.slice(0, 8)}...</span>
      </div>
    `;

    // Mount note header
    const headerContainer = noteDiv.querySelector('.event-header-container');
    if (headerContainer) {
      headerContainer.appendChild(noteHeader.getElement());
    }

    return noteDiv;
  }

  /**
   * Check if content is long and needs truncation
   */
  private static hasLongContent(content: string): boolean {
    return content.length > 500 || content.split('\n').length > 10;
  }

  /**
   * Render media content (images, videos)
   */
  private static renderMediaContent(media: ProcessedNote['content']['media']): string {
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
   * Render link previews
   */
  private static renderLinks(links: ProcessedNote['content']['links']): string {
    if (links.length === 0) return '';

    const linksHtml = links.map(link => `
      <div class="note-link-preview">
        <a href="${link.url}" target="_blank" rel="noopener">
          ${link.title || link.domain}
        </a>
      </div>
    `).join('');

    return `<div class="note-links">${linksHtml}</div>`;
  }

  /**
   * Render quoted references as quote boxes
   */
  private static renderQuotedReferences(quotedReferences: ProcessedNote['content']['quotedReferences']): string {
    if (quotedReferences.length === 0) return '';

    const quotesHtml = quotedReferences.map(ref => {
      // For now, show a simple quote box with placeholder
      // TODO: Fetch and display actual quoted content
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
   * Cleanup note headers for memory management
   */
  static cleanup(noteId: string): void {
    const noteHeader = NoteUI.noteHeaders.get(noteId);
    if (noteHeader) {
      // Clean up any event listeners or resources
      NoteUI.noteHeaders.delete(noteId);
    }
  }

  /**
   * Cleanup all note headers
   */
  static cleanupAll(): void {
    NoteUI.noteHeaders.clear();
  }
}