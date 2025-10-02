/**
 * SingleNoteView Component
 * Displays a single note with full content
 * Reuses NoteHeader component for consistency with Timeline
 */

import { NoteHeader } from '../ui/NoteHeader';
import { fetchNostrEvents } from '../../helpers/fetchNostrEvents';
import { RelayConfig } from '../../services/RelayConfig';
import { nip19 } from 'nostr-tools';
import type { Event as NostrEvent } from 'nostr-tools';

export class SingleNoteView {
  private container: HTMLElement;
  private noteId: string;
  private noteHeader: NoteHeader | null = null;
  private relayConfig: RelayConfig;

  constructor(noteId: string) {
    this.noteId = noteId;
    this.container = document.createElement('div');
    this.container.className = 'snv-container';
    this.relayConfig = RelayConfig.getInstance();

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

    // Build note content
    noteElement.innerHTML = `
      <div class="snv-note__header-container"></div>
      <div class="snv-note__content">${this.escapeHtml(event.content)}</div>
      <div class="snv-note__footer">
        <button class="snv-back-btn" onclick="history.back()">← Back to Timeline</button>
      </div>
    `;

    // Mount NoteHeader
    const headerContainer = noteElement.querySelector('.snv-note__header-container');
    if (headerContainer && this.noteHeader) {
      headerContainer.appendChild(this.noteHeader.getElement());
    }

    this.container.appendChild(noteElement);
  }

  /**
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
