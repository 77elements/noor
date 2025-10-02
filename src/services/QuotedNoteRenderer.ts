/**
 * QuotedNoteRenderer Service
 * Single responsibility: Render quoted notes as quote boxes
 * Used by both NoteUI and SingleNoteView
 */

import type { Event as NostrEvent } from 'nostr-tools';
import { NoteHeader } from '../components/ui/NoteHeader';
import { QuoteNoteFetcher } from './QuoteNoteFetcher';
import { ContentProcessor, type QuotedReference } from './ContentProcessor';
import { renderMediaContent } from '../helpers/renderMediaContent';

export class QuotedNoteRenderer {
  private static instance: QuotedNoteRenderer;
  private quoteFetcher: QuoteNoteFetcher;
  private contentProcessor: ContentProcessor;

  private constructor() {
    this.quoteFetcher = QuoteNoteFetcher.getInstance();
    this.contentProcessor = ContentProcessor.getInstance();
  }

  static getInstance(): QuotedNoteRenderer {
    if (!QuotedNoteRenderer.instance) {
      QuotedNoteRenderer.instance = new QuotedNoteRenderer();
    }
    return QuotedNoteRenderer.instance;
  }

  /**
   * Render quoted notes as quote boxes (NON-BLOCKING)
   * Creates skeletons immediately, fetches in background
   */
  renderQuotedNotes(quotedReferences: QuotedReference[], container: Element): void {
    quotedReferences.forEach((ref) => {
      const skeleton = this.createQuoteSkeleton();
      skeleton.dataset.quoteRef = ref.fullMatch;
      container.appendChild(skeleton);

      // Fetch quote in background
      this.fetchAndRenderQuote(ref, skeleton);
    });
  }

  /**
   * Fetch single quote and update DOM when ready (background task)
   */
  private async fetchAndRenderQuote(ref: QuotedReference, skeleton: HTMLElement): Promise<void> {
    try {
      const result = await this.quoteFetcher.fetchQuotedEventWithError(ref.fullMatch);

      if (result.success) {
        const quoteBox = this.createQuoteBox(result.event);
        skeleton.replaceWith(quoteBox);
      } else {
        const errorElement = this.createQuoteError(result.error);
        skeleton.replaceWith(errorElement);
      }
    } catch (error) {
      console.error(`❌ Quote fetch failed:`, error);
      skeleton.remove();
    }
  }

  /**
   * Create quote box element from event
   */
  private createQuoteBox(event: NostrEvent): HTMLElement {
    const quoteBox = document.createElement('div');
    quoteBox.className = 'quote-box';

    // Process event content
    const processedContent = event.tags
      ? this.contentProcessor.processContentWithTags(event.content, event.tags)
      : this.contentProcessor.processContent(event.content);

    // Create header
    const header = new NoteHeader({
      pubkey: event.pubkey,
      timestamp: event.created_at,
      size: 'small',
      showVerification: false,
      showTimestamp: true,
    });

    const contentDiv = document.createElement('div');
    contentDiv.className = 'quote-content';
    contentDiv.innerHTML = `
      <div class="quote-header-container"></div>
      <div class="quote-text">${processedContent.html}</div>
      ${renderMediaContent(processedContent.media)}
    `;

    // Mount header
    const headerContainer = contentDiv.querySelector('.quote-header-container');
    if (headerContainer) {
      headerContainer.appendChild(header.getElement());
    }

    quoteBox.appendChild(contentDiv);

    return quoteBox;
  }

  /**
   * Create error element for failed quote fetch
   */
  private createQuoteError(error: any): HTMLElement {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'quote-error';
    errorDiv.innerHTML = `
      <div class="quote-error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-text">${error.message || 'Failed to load quoted note'}</span>
      </div>
    `;
    return errorDiv;
  }

  /**
   * Create skeleton loader for quoted note during fetch
   */
  private createQuoteSkeleton(): HTMLElement {
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
}
