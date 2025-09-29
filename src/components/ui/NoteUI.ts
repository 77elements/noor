/**
 * NoteUI Component
 * Single responsibility: Assemble HTML for one note
 * Takes ProcessedNote input, outputs HTMLElement
 */

import type { Event as NostrEvent } from 'nostr-tools';
import { NoteContentProcessing, ProcessedNote } from '../content/NoteContentProcessing';
import { NoteHeader } from './NoteHeader';
import { QuoteNoteFetcher, type QuoteFetchError } from '../../services/QuoteNoteFetcher';
import { renderMediaContent, renderQuotedReferencesPlaceholder } from '../../helpers/htmlRenderers';

export class NoteUI {
  private static noteHeaders: Map<string, NoteHeader> = new Map();
  private static noteProcessor: NoteContentProcessing = NoteContentProcessing.getInstance();
  private static quoteFetcher: QuoteNoteFetcher = QuoteNoteFetcher.getInstance();

  // Maximum nesting depth for quoted notes (prevents infinite recursion)
  private static readonly MAX_NESTING_DEPTH = 2;

  /**
   * Create HTML element for any nostr event (processes content internally)
   * @param event - The Nostr event to render
   * @param index - Optional index for tracking position
   * @param depth - Current nesting depth (0 = top-level, increases for each quoted note)
   */
  static async createNoteElement(event: NostrEvent, index?: number, depth: number = 0): Promise<HTMLElement> {
    try {
      // Check if we've exceeded maximum nesting depth
      if (depth > NoteUI.MAX_NESTING_DEPTH) {
        console.warn(`⚠️ Max nesting depth (${NoteUI.MAX_NESTING_DEPTH}) reached for note ${event.id.slice(0, 8)}`);
        return NoteUI.createMaxDepthElement(event);
      }

      // Process the event internally
      const note = await NoteUI.noteProcessor.processNote(event);

      switch (note.type) {
        case 'repost':
          return NoteUI.createRepostElement(note, depth);
        case 'quote':
          return await NoteUI.createQuoteElement(note, depth);
        default:
          return NoteUI.createOriginalNoteElement(note, depth);
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
   * Create element when max nesting depth is reached
   */
  private static createMaxDepthElement(event: NostrEvent): HTMLElement {
    const maxDepthDiv = document.createElement('div');
    maxDepthDiv.className = 'quote-max-depth';
    maxDepthDiv.dataset.eventId = event.id;

    maxDepthDiv.innerHTML = `
      <div class="max-depth-content">
        <span class="depth-icon">📄</span>
        <span class="depth-text">Quoted note (max depth reached)</span>
        <small class="depth-id">ID: ${event.id.slice(0, 12)}...</small>
      </div>
    `;

    // Make it clickable to view full note in new context
    maxDepthDiv.style.cursor = 'pointer';
    maxDepthDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log(`View full note: ${event.id.slice(0, 8)}`);
      // TODO: Open note in detail view or new page
    });

    return maxDepthDiv;
  }

  /**
   * Create repost element with "User reposted" display
   */
  private static createRepostElement(note: ProcessedNote, depth: number): HTMLElement {
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

    // Original note content with original author (same depth, not nested deeper)
    const originalNoteElement = NoteUI.createOriginalNoteElement(note, depth);

    repostDiv.appendChild(repostHeader);
    repostDiv.appendChild(originalNoteElement);

    return repostDiv;
  }

  /**
   * Build note structure (shared logic for quotes and originals)
   * Eliminates code duplication between createQuoteElement and createOriginalNoteElement
   */
  private static buildNoteStructure(
    note: ProcessedNote,
    options: {
      cssClass: string;
      footerLabel: string;
      renderQuotedNotes: boolean;
    }
  ): { element: HTMLElement; noteHeader: NoteHeader } {
    const noteDiv = document.createElement('div');
    noteDiv.className = `timeline-event ${options.cssClass}`;
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

    // Check for long content
    const hasLong = NoteUI.hasLongContent(note.content.text);
    const contentClass = hasLong ? 'event-content has-long-content' : 'event-content';

    // Build HTML structure - different for quotes vs originals
    const quotedSection = options.renderQuotedNotes
      ? '<div class="quoted-notes-container"><!-- Quoted notes will be rendered here --></div>'
      : renderQuotedReferencesPlaceholder(note.content.quotedReferences);

    noteDiv.innerHTML = `
      <div class="event-header-container"></div>
      <div class="${contentClass}">${note.content.html}</div>
      ${renderMediaContent(note.content.media)}
      ${quotedSection}
      <div class="event-footer">
        <span class="event-kind">Kind ${note.rawEvent.kind}${options.footerLabel ? ` (${options.footerLabel})` : ''}</span>
        <span class="event-id">${note.id.slice(0, 8)}...</span>
      </div>
    `;

    // Mount note header
    const headerContainer = noteDiv.querySelector('.event-header-container');
    if (headerContainer) {
      headerContainer.appendChild(noteHeader.getElement());
    }

    return { element: noteDiv, noteHeader };
  }

  /**
   * Create quote element with embedded quoted notes
   */
  private static async createQuoteElement(note: ProcessedNote, depth: number): Promise<HTMLElement> {
    const { element, noteHeader } = NoteUI.buildNoteStructure(note, {
      cssClass: 'timeline-quote',
      footerLabel: 'Quote',
      renderQuotedNotes: true
    });

    // Store reference for cleanup
    NoteUI.noteHeaders.set(note.id, noteHeader);

    // Render quoted notes with increased depth
    const quotedContainer = element.querySelector('.quoted-notes-container');
    if (quotedContainer && note.content.quotedReferences.length > 0) {
      await NoteUI.renderQuotedNotes(note.content.quotedReferences, quotedContainer, depth + 1);
    }

    return element;
  }

  /**
   * Create original note element
   */
  private static createOriginalNoteElement(note: ProcessedNote, depth: number): HTMLElement {
    const { element, noteHeader } = NoteUI.buildNoteStructure(note, {
      cssClass: 'timeline-original',
      footerLabel: '',
      renderQuotedNotes: false
    });

    // Store reference for cleanup
    NoteUI.noteHeaders.set(note.id, noteHeader);

    return element;
  }

  /**
   * Check if content is long and needs truncation
   */
  private static hasLongContent(content: string): boolean {
    return content.length > 500 || content.split('\n').length > 10;
  }

  /**
   * Render quoted notes as orange quote boxes
   */
  private static async renderQuotedNotes(quotedReferences: ProcessedNote['content']['quotedReferences'], container: Element, depth: number): Promise<void> {
    for (const ref of quotedReferences) {
      // Create skeleton loader immediately (before fetch)
      const skeleton = NoteUI.createQuoteSkeleton();
      container.appendChild(skeleton);

      console.log(`📎 Fetching quoted note: ${ref.fullMatch} (depth: ${depth})`);

      // Fetch with detailed error information
      const result = await NoteUI.quoteFetcher.fetchQuotedEventWithError(ref.fullMatch);

      // Remove skeleton
      skeleton.remove();

      if (result.success) {
        // Successfully fetched - render the note
        const quotedNoteElement = await NoteUI.createNoteElement(result.event, undefined, depth);

        // Wrap in quote box
        const quoteBox = document.createElement('div');
        quoteBox.className = 'quote-box';
        quoteBox.appendChild(quotedNoteElement);

        // Add click handler
        quoteBox.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log(`Expand quoted note: ${result.event.id.slice(0, 8)}`);
        });

        container.appendChild(quoteBox);
      } else {
        // Error occurred - render appropriate error message
        const errorElement = NoteUI.createQuoteError(result.error, ref.fullMatch);
        container.appendChild(errorElement);
      }
    }
  }

  /**
   * Create error element for failed quote fetch
   */
  private static createQuoteError(error: QuoteFetchError, reference: string): HTMLElement {
    const errorDiv = document.createElement('div');

    switch (error.type) {
      case 'not_found':
        errorDiv.className = 'quote-not-found';
        errorDiv.innerHTML = `
          <div class="quote-error-content">
            <span class="error-icon">🔍</span>
            <div class="error-details">
              <span class="error-text">${error.message}</span>
              <small class="error-id">ID: ${error.eventId}...</small>
            </div>
          </div>
        `;
        break;

      case 'network':
        errorDiv.className = 'quote-network-error';
        errorDiv.innerHTML = `
          <div class="quote-error-content">
            <span class="error-icon">⚠️</span>
            <div class="error-details">
              <span class="error-text">${error.message}</span>
              <button class="retry-btn" data-reference="${reference}">Try again</button>
            </div>
          </div>
        `;

        // Add retry handler
        const retryBtn = errorDiv.querySelector('.retry-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const btn = e.target as HTMLButtonElement;
            btn.disabled = true;
            btn.textContent = 'Retrying...';

            // Retry fetch
            const result = await NoteUI.quoteFetcher.fetchQuotedEventWithError(reference);

            if (result.success) {
              // Replace error with actual note
              const quotedNoteElement = await NoteUI.createNoteElement(result.event);
              const quoteBox = document.createElement('div');
              quoteBox.className = 'quote-box';
              quoteBox.appendChild(quotedNoteElement);
              errorDiv.replaceWith(quoteBox);
            } else {
              // Retry failed
              btn.disabled = false;
              btn.textContent = 'Try again';
            }
          });
        }
        break;

      case 'parse':
        errorDiv.className = 'quote-parse-error';
        errorDiv.innerHTML = `
          <div class="quote-error-content">
            <span class="error-icon">⚠️</span>
            <div class="error-details">
              <span class="error-text">${error.message}</span>
              <small class="error-ref">${error.reference.slice(0, 30)}...</small>
            </div>
          </div>
        `;
        break;

      default:
        errorDiv.className = 'quote-error';
        errorDiv.innerHTML = `
          <div class="quote-error-content">
            <span class="error-icon">⚠️</span>
            <span class="error-text">${error.message}</span>
          </div>
        `;
    }

    return errorDiv;
  }

  /**
   * Create skeleton loader for quoted note during fetch
   */
  private static createQuoteSkeleton(): HTMLElement {
    const skeleton = document.createElement('div');
    skeleton.className = 'quote-skeleton';

    skeleton.innerHTML = `
      <div class="skeleton-header">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-text-group">
          <div class="skeleton-line skeleton-name"></div>
          <div class="skeleton-line skeleton-timestamp"></div>
        </div>
      </div>
      <div class="skeleton-content">
        <div class="skeleton-line skeleton-text-line"></div>
        <div class="skeleton-line skeleton-text-line"></div>
        <div class="skeleton-line skeleton-text-line short"></div>
      </div>
    `;

    return skeleton;
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