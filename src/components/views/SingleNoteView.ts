/**
 * SingleNoteView Component
 * Displays a single note with full content
 * Reuses NoteHeader component for consistency with Timeline
 */

import { NoteHeader } from '../ui/NoteHeader';
import { fetchNostrEvents } from '../../helpers/fetchNostrEvents';
import { RelayConfig } from '../../services/RelayConfig';
import { ContentProcessor, type QuotedReference } from '../../services/ContentProcessor';
import { QuotedNoteRenderer } from '../../services/QuotedNoteRenderer';
import { nip19 } from 'nostr-tools';
import type { Event as NostrEvent } from 'nostr-tools';
import { renderMediaContent } from '../../helpers/renderMediaContent';
import type { MediaContent } from '../../helpers/renderMediaContent';

export class SingleNoteView {
  private container: HTMLElement;
  private noteId: string;
  private noteHeader: NoteHeader | null = null;
  private relayConfig: RelayConfig;
  private contentProcessor: ContentProcessor;
  private quotedNoteRenderer: QuotedNoteRenderer;

  constructor(noteId: string) {
    this.noteId = noteId;
    this.container = document.createElement('div');
    this.container.className = 'snv-container';
    this.relayConfig = RelayConfig.getInstance();
    this.contentProcessor = ContentProcessor.getInstance();
    this.quotedNoteRenderer = QuotedNoteRenderer.getInstance();

    this.render();
  }

  /**
   * Initial render - show loading, then load note
   */
  private async render(): Promise<void> {
    // Show loading state
    this.container.innerHTML = `
      <div class="snv-loading">
        <div class="loading-spinner"></div>
        <p>Loading note...</p>
      </div>
    `;

    try {
      // Decode nevent/note ID
      const actualNoteId = this.decodeNoteId(this.noteId);

      // Fetch the note
      const event = await this.fetchNote(actualNoteId);

      if (!event) {
        this.showError('Note not found');
        return;
      }

      this.renderNote(event);
    } catch (error) {
      console.error('❌ SNV: Failed to load note', error);
      this.showError('Failed to load note');
    }
  }

  /**
   * Decode nevent/note/hex ID to actual note ID
   */
  private decodeNoteId(noteId: string): string {
    if (noteId.startsWith('nevent1')) {
      const decoded = nip19.decode(noteId);
      if (decoded.type === 'nevent') {
        return decoded.data.id;
      }
    } else if (noteId.startsWith('note1')) {
      const decoded = nip19.decode(noteId);
      if (decoded.type === 'note') {
        return decoded.data as string;
      }
    }

    // Assume it's already a hex ID
    return noteId;
  }

  /**
   * Fetch note from relays
   */
  private async fetchNote(noteId: string): Promise<NostrEvent | null> {
    console.log(`📄 SNV: Fetching note ${noteId.slice(0, 8)}...`);

    // Get read relays from config
    const relays = this.relayConfig.getReadRelays();

    // Fetch by ID
    const result = await fetchNostrEvents({
      relays,
      ids: [noteId],
      limit: 1
    });

    if (result.events.length === 0) {
      console.warn(`⚠️ SNV: Note ${noteId.slice(0, 8)} not found`);
      return null;
    }

    console.log(`✅ SNV: Note ${noteId.slice(0, 8)} loaded`);
    return result.events[0];
  }

  /**
   * Render the loaded note with NoteHeader
   */
  private renderNote(event: NostrEvent): void {
    // Check if this is a repost (kind 6)
    if (event.kind === 6) {
      this.renderRepost(event);
      return;
    }

    // Clear loading state
    this.container.innerHTML = '';

    // Create note structure
    const noteElement = document.createElement('div');
    noteElement.className = 'snv-note';
    noteElement.dataset.eventId = event.id;

    // Create NoteHeader component (REUSED from Timeline!)
    this.noteHeader = new NoteHeader({
      pubkey: event.pubkey,
      timestamp: event.created_at,
      size: 'large',
      showVerification: true,
      showTimestamp: true,
    });

    // Process content using shared service
    const processedContent = this.contentProcessor.processContent(event.content);

    // Build note content
    noteElement.innerHTML = `
      <div class="snv-note__header-container"></div>
      <div class="snv-note__content">${processedContent.html}</div>
      ${renderMediaContent(processedContent.media)}
      <div class="quoted-notes-container"></div>
      <div class="snv-note__footer">
        <button class="snv-back-btn" onclick="history.back()">← Back to Timeline</button>
      </div>
    `;

    // Mount NoteHeader
    const headerContainer = noteElement.querySelector('.snv-note__header-container');
    if (headerContainer && this.noteHeader) {
      headerContainer.appendChild(this.noteHeader.getElement());
    }

    // Render quoted notes using shared service
    if (processedContent.quotedReferences.length > 0) {
      const quotedContainer = noteElement.querySelector('.quoted-notes-container');
      if (quotedContainer) {
        this.quotedNoteRenderer.renderQuotedNotes(processedContent.quotedReferences, quotedContainer);
      }
    }

    this.container.appendChild(noteElement);
  }

  /**
   * Render a repost (kind 6) - show original content, not the repost wrapper
   */
  private renderRepost(repostEvent: NostrEvent): void {
    // Extract original event from repost
    let originalEvent: NostrEvent | null = null;
    let originalAuthorPubkey: string | null = null;

    try {
      if (repostEvent.content && repostEvent.content.trim()) {
        originalEvent = JSON.parse(repostEvent.content);
      }
    } catch (error) {
      console.warn('⚠️ Could not parse repost content as JSON');
    }

    // Get original author from tags
    const pTags = repostEvent.tags.filter(tag => tag[0] === 'p');
    if (pTags.length > 0) {
      originalAuthorPubkey = pTags[0][1];
    }

    // If we couldn't parse the original event, show error
    if (!originalEvent || !originalEvent.content) {
      this.showError('Could not load reposted content');
      return;
    }

    // Clear loading state
    this.container.innerHTML = '';

    // Create note structure
    const noteElement = document.createElement('div');
    noteElement.className = 'snv-note';
    noteElement.dataset.eventId = originalEvent.id || repostEvent.id;

    // Create NoteHeader for ORIGINAL author (not reposter)
    const authorPubkey = originalAuthorPubkey || originalEvent.pubkey;
    this.noteHeader = new NoteHeader({
      pubkey: authorPubkey,
      timestamp: originalEvent.created_at,
      size: 'large',
      showVerification: true,
      showTimestamp: true,
    });

    // Process content with original event's tags using shared service
    const processedContent = this.contentProcessor.processContentWithTags(
      originalEvent.content,
      originalEvent.tags || []
    );

    // Build note content
    noteElement.innerHTML = `
      <div class="snv-note__header-container"></div>
      <div class="snv-note__content">${processedContent.html}</div>
      ${renderMediaContent(processedContent.media)}
      <div class="quoted-notes-container"></div>
      <div class="snv-note__footer">
        <button class="snv-back-btn" onclick="history.back()">← Back to Timeline</button>
      </div>
    `;

    // Mount NoteHeader
    const headerContainer = noteElement.querySelector('.snv-note__header-container');
    if (headerContainer && this.noteHeader) {
      headerContainer.appendChild(this.noteHeader.getElement());
    }

    // Render quoted notes using shared service
    if (processedContent.quotedReferences.length > 0) {
      const quotedContainer = noteElement.querySelector('.quoted-notes-container');
      if (quotedContainer) {
        this.quotedNoteRenderer.renderQuotedNotes(processedContent.quotedReferences, quotedContainer);
      }
    }

    this.container.appendChild(noteElement);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.container.innerHTML = `
      <div class="snv-error">
        <div class="snv-error__icon">⚠️</div>
        <div class="snv-error__message">${message}</div>
        <button class="snv-back-btn" onclick="history.back()">← Back to Timeline</button>
      </div>
    `;
  }

  /**
   * Get the DOM element
   */
  public getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.noteHeader) {
      this.noteHeader.destroy();
      this.noteHeader = null;
    }
    this.container.remove();
  }
}
