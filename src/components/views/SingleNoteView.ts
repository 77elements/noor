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

    // Process content with original event's tags
    const processedContent = this.processContentWithTags(
      originalEvent.content,
      originalEvent.tags || []
    );

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
    return this.processContentWithTags(text, []);
  }

  /**
   * Process content with tags (for mention profile loading)
   */
  private processContentWithTags(text: string, tags: string[][]): {
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

    // NON-BLOCKING: Trigger profile fetch for mentions in background
    const mentionTags = tags.filter(tag => tag[0] === 'p' && tag[3] === 'mention');
    if (mentionTags.length > 0) {
      const mentionPubkeys = mentionTags.map(tag => tag[1]);
      // Fire and forget - profiles will update cache when they arrive
      this.userProfileService.getUserProfiles(mentionPubkeys).then(profiles => {
        profiles.forEach((profile, pubkey) => {
          this.profileCache.set(pubkey, profile);
        });
      }).catch(err => console.warn('Failed to load mention profiles:', err));
    }

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
