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
import { extractMedia } from '../../helpers/extractMedia';
import { extractLinks } from '../../helpers/extractLinks';
import { extractHashtags } from '../../helpers/extractHashtags';
import { extractQuotedReferences } from '../../helpers/extractQuotedReferences';
import { escapeHtml } from '../../helpers/escapeHtml';
import { linkifyUrls } from '../../helpers/linkifyUrls';
import { formatHashtags } from '../../helpers/formatHashtags';
import { formatQuotedReferences } from '../../helpers/formatQuotedReferences';
import { convertLineBreaks } from '../../helpers/convertLineBreaks';
import { renderMediaContent } from '../../helpers/renderMediaContent';
import { renderQuotedReferencesPlaceholder } from '../../helpers/renderQuotedReferencesPlaceholder';
import { npubToUsername } from '../../helpers/npubToUsername';
import { UserProfileService } from '../../services/UserProfileService';
import type { MediaContent } from '../../helpers/renderMediaContent';
import type { QuotedReference } from '../../helpers/renderQuotedReferencesPlaceholder';

export class SingleNoteView {
  private container: HTMLElement;
  private noteId: string;
  private noteHeader: NoteHeader | null = null;
  private relayConfig: RelayConfig;
  private userProfileService: UserProfileService;
  private profileCache: Map<string, any> = new Map();

  constructor(noteId: string) {
    this.noteId = noteId;
    this.container = document.createElement('div');
    this.container.className = 'snv-container';
    this.relayConfig = RelayConfig.getInstance();
    this.userProfileService = UserProfileService.getInstance();

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

    // Process content with all helpers (same as NoteUI does)
    const processedContent = this.processContent(event.content);

    // Build note content
    noteElement.innerHTML = `
      <div class="snv-note__header-container"></div>
      <div class="snv-note__content">${processedContent.html}</div>
      ${renderMediaContent(processedContent.media)}
      ${renderQuotedReferencesPlaceholder(processedContent.quotedReferences)}
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
   * Process content with individual helpers (same as NoteUI.processContent)
   */
  private processContent(text: string): {
    text: string;
    html: string;
    media: MediaContent[];
    hashtags: string[];
    quotedReferences: QuotedReference[];
  } {
    const media = extractMedia(text);
    const links = extractLinks(text);
    const hashtags = extractHashtags(text);
    const quotedRefs = extractQuotedReferences(text);

    const quotedReferences: QuotedReference[] = quotedRefs.map(ref => ({
      type: ref.type,
      id: ref.id,
      fullMatch: ref.fullMatch
    }));

    // Profile resolver for mentions
    const profileResolver = (hexPubkey: string) => {
      const profile = this.getNonBlockingProfile(hexPubkey);
      return profile ? {
        name: profile.name,
        display_name: profile.display_name,
        picture: profile.picture
      } : null;
    };

    // Remove media URLs and quoted references from text
    let cleanedText = text;
    media.forEach(item => {
      cleanedText = cleanedText.replace(item.url, '');
    });
    quotedReferences.forEach(ref => {
      cleanedText = cleanedText.replace(ref.fullMatch, '');
    });
    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n').trim();

    // Process HTML with individual helpers
    let html = escapeHtml(cleanedText);
    html = linkifyUrls(html);
    html = npubToUsername(html, 'html-multi', profileResolver);
    html = formatHashtags(html, hashtags);
    html = formatQuotedReferences(html, quotedReferences);
    html = convertLineBreaks(html);

    return {
      text,
      html,
      media,
      hashtags,
      quotedReferences
    };
  }

  /**
   * Get profile non-blocking with cache
   */
  private getNonBlockingProfile(pubkey: string): any {
    if (this.profileCache.has(pubkey)) {
      return this.profileCache.get(pubkey);
    }

    const fallbackProfile = {
      pubkey,
      name: null,
      display_name: null,
      picture: '',
      about: null
    };

    this.profileCache.set(pubkey, fallbackProfile);

    this.userProfileService.getUserProfile(pubkey)
      .then(realProfile => {
        if (realProfile) {
          this.profileCache.set(pubkey, realProfile);
        }
      })
      .catch(error => {
        console.warn(`Profile load failed for ${pubkey.slice(0, 8)}:`, error);
      });

    return fallbackProfile;
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
