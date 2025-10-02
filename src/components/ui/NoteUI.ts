/**
 * NoteUI Component
 * Single responsibility: Assemble HTML for one note
 * Takes ProcessedNote input, outputs HTMLElement
 */

import type { Event as NostrEvent } from 'nostr-tools';
import { NoteHeader } from './NoteHeader';
import { UserProfileService } from '../../services/UserProfileService';
import { Router } from '../../services/Router';
import { ContentProcessor } from '../../services/ContentProcessor';
import { QuotedNoteRenderer } from '../../services/QuotedNoteRenderer';
import { renderMediaContent } from '../../helpers/renderMediaContent';
import { renderQuotedReferencesPlaceholder } from '../../helpers/renderQuotedReferencesPlaceholder';
import { npubToUsername } from '../../helpers/npubToUsername';
import { hexToNpub } from '../../helpers/hexToNpub';
import { nip19 } from 'nostr-tools';

// Types from NoteContentProcessing (now local)
export interface ProcessedNote {
  id: string;
  type: 'original' | 'repost' | 'quote';
  timestamp: number;
  author: {
    pubkey: string;
    profile?: {
      name?: string;
      display_name?: string;
      picture?: string;
    };
  };
  reposter?: {
    pubkey: string;
    profile?: {
      name?: string;
      display_name?: string;
      picture?: string;
    };
  };
  content: {
    text: string;
    html: string;
    media: MediaContent[];
    links: LinkPreview[];
    hashtags: string[];
    quotedReferences: QuotedReference[];
  };
  rawEvent: NostrEvent;
  quotedEvent?: ProcessedNote;
}

export interface MediaContent {
  type: 'image' | 'video' | 'audio';
  url: string;
  alt?: string;
  thumbnail?: string;
  dimensions?: { width: number; height: number };
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  domain: string;
}

export interface QuotedReference {
  type: 'event' | 'note' | 'addr';
  id: string;
  fullMatch: string;
  quotedNote?: ProcessedNote;
}

export class NoteUI {
  private static noteHeaders: Map<string, NoteHeader> = new Map();
  private static userProfileService: UserProfileService = UserProfileService.getInstance();
  private static contentProcessor: ContentProcessor = ContentProcessor.getInstance();
  private static quotedNoteRenderer: QuotedNoteRenderer = QuotedNoteRenderer.getInstance();

  // Maximum nesting depth for quoted notes (prevents infinite recursion)
  private static readonly MAX_NESTING_DEPTH = 2;

  // Collapsible note thresholds (in viewport height units)
  private static readonly COLLAPSIBLE_HEIGHT_THRESHOLD = 0.40; // 40vh - collapse if taller than this
  private static readonly COLLAPSIBLE_MIN_DIFFERENCE = 0.05;   // 5vh - only collapse if difference is significant

  /**
   * Create HTML element for any nostr event (processes content internally)
   * NOW SYNCHRONOUS - returns immediately with skeleton, background tasks update DOM
   * @param event - The Nostr event to render
   * @param index - Optional index for tracking position
   * @param depth - Current nesting depth (0 = top-level, increases for each quoted note)
   */
  static createNoteElement(event: NostrEvent, index?: number, depth: number = 0): HTMLElement {
    try {
      // Check if we've exceeded maximum nesting depth
      if (depth > NoteUI.MAX_NESTING_DEPTH) {
        console.warn(`⚠️ Max nesting depth (${NoteUI.MAX_NESTING_DEPTH}) reached for note ${event.id.slice(0, 8)}`);
        return NoteUI.createMaxDepthElement(event);
      }

      // Process the event internally with direct helpers (SYNCHRONOUS now!)
      const note = NoteUI.processNote(event);

      switch (note.type) {
        case 'repost':
          return NoteUI.createRepostElement(note, depth);
        case 'quote':
          return NoteUI.createQuoteElement(note, depth);
        default:
          return NoteUI.createOriginalNoteElement(note, depth);
      }
    } catch (error) {
      console.error('❌ Error processing note:', event.id, error);
      return NoteUI.createErrorNoteElement(event, error);
    }
  }

  /**
   * Process note using direct helpers (replaces NoteContentProcessing)
   * SYNCHRONOUS - no blocking calls
   */
  private static processNote(event: NostrEvent): ProcessedNote {
    try {
      switch (event.kind) {
        case 1:
          return NoteUI.processTextNote(event);
        case 6:
          return NoteUI.processRepost(event);
        default:
          console.warn(`⚠️ Unsupported note kind: ${event.kind}`);
          return NoteUI.processTextNote(event);
      }
    } catch (error) {
      console.error(`❌ ERROR processing note ${event.id.slice(0, 8)}:`, error);
      return {
        id: event.id,
        type: 'original',
        timestamp: event.created_at,
        author: { pubkey: event.pubkey },
        content: {
          text: event.content,
          html: event.content.replace(/\n/g, '<br>'),
          media: [],
          links: [],
          hashtags: [],
          quotedReferences: []
        },
        rawEvent: event
      };
    }
  }

  /**
   * Process text note (kind 1) with ContentProcessor
   * SYNCHRONOUS - no blocking calls
   */
  private static processTextNote(event: NostrEvent): ProcessedNote {
    const authorProfile = NoteUI.contentProcessor.getNonBlockingProfile(event.pubkey);
    const quoteTags = event.tags.filter(tag => tag[0] === 'q');
    const isQuote = quoteTags.length > 0;

    const processedContent = NoteUI.contentProcessor.processContentWithTags(event.content, event.tags);

    return {
      id: event.id,
      type: isQuote ? 'quote' : 'original',
      timestamp: event.created_at,
      author: {
        pubkey: event.pubkey,
        profile: authorProfile ? {
          name: authorProfile.name,
          display_name: authorProfile.display_name,
          picture: authorProfile.picture
        } : undefined
      },
      content: processedContent,
      rawEvent: event
    };
  }

  /**
   * Process repost (kind 6) with ContentProcessor
   * SYNCHRONOUS - no blocking calls
   */
  private static processRepost(event: NostrEvent): ProcessedNote {
    const reposterProfile = NoteUI.contentProcessor.getNonBlockingProfile(event.pubkey);
    const originalEventId = NoteUI.extractOriginalEventId(event);
    const originalAuthorPubkey = NoteUI.extractOriginalAuthorPubkey(event);

    let originalAuthorProfile;
    if (originalAuthorPubkey) {
      originalAuthorProfile = NoteUI.contentProcessor.getNonBlockingProfile(originalAuthorPubkey);
    }

    let originalContent = 'Reposted content';
    let originalEvent: NostrEvent | null = null;

    try {
      if (event.content && event.content.trim()) {
        originalEvent = JSON.parse(event.content);
        if (originalEvent && originalEvent.content) {
          originalContent = originalEvent.content;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not parse repost content as JSON');
    }

    // Process content with original event's tags for proper mention handling
    const processedContent = originalEvent
      ? NoteUI.contentProcessor.processContentWithTags(originalContent, originalEvent.tags)
      : NoteUI.contentProcessor.processContent(originalContent);

    return {
      id: event.id,
      type: 'repost',
      timestamp: event.created_at,
      author: originalAuthorPubkey ? {
        pubkey: originalAuthorPubkey,
        profile: originalAuthorProfile ? {
          name: originalAuthorProfile.name,
          display_name: originalAuthorProfile.display_name,
          picture: originalAuthorProfile.picture
        } : undefined
      } : {
        pubkey: event.pubkey,
        profile: reposterProfile ? {
          name: reposterProfile.name,
          display_name: reposterProfile.display_name,
          picture: reposterProfile.picture
        } : undefined
      },
      reposter: {
        pubkey: event.pubkey,
        profile: reposterProfile ? {
          name: reposterProfile.name,
          display_name: reposterProfile.display_name,
          picture: reposterProfile.picture
        } : undefined
      },
      content: processedContent,
      rawEvent: event
    };
  }

  /**
   * Extract original event ID from repost tags
   */
  private static extractOriginalEventId(event: NostrEvent): string | null {
    const eTags = event.tags.filter(tag => tag[0] === 'e');
    return eTags.length > 0 ? eTags[0][1] : null;
  }

  /**
   * Extract original author pubkey from repost tags
   */
  private static extractOriginalAuthorPubkey(event: NostrEvent): string | null {
    const pTags = event.tags.filter(tag => tag[0] === 'p');
    return pTags.length > 0 ? pTags[0][1] : null;
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
    const reposterPubkey = note.reposter?.pubkey || '';
    const reposterNpub = reposterPubkey ? hexToNpub(reposterPubkey) || '' : '';
    const reposterName = reposterNpub ? npubToUsername(reposterNpub) : 'Unknown';

    const repostHeader = document.createElement('div');
    repostHeader.className = 'repost-header';
    repostHeader.innerHTML = `
      <span class="repost-icon">🔄</span>
      <a href="/profile/${reposterNpub}" class="reposter-name">${reposterName}</a> reposted
    `;

    // Subscribe to profile updates to refresh username when loaded
    if (reposterPubkey) {
      const userProfileService = UserProfileService.getInstance();
      userProfileService.subscribeToProfile(reposterPubkey, (profile) => {
        const newUsername = profile.display_name || profile.name || reposterNpub;
        const reposterNameElement = repostHeader.querySelector('.reposter-name');
        if (reposterNameElement && newUsername !== reposterNpub) {
          reposterNameElement.textContent = `@${newUsername}`;
        }
      });
    }

    // Original note content with original author (depth 0 to enable collapsible)
    const originalNoteElement = NoteUI.createOriginalNoteElement(note, 0);

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

    const processedHtml = note.content.html;

    noteDiv.innerHTML = `
      <div class="event-header-container"></div>
      <div class="${contentClass}">${processedHtml}</div>
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

    // Add click handler to navigate to Single Note View
    // Click on note body (exclude links, images, videos, buttons)
    noteDiv.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Don't navigate if clicking on interactive elements
      if (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'IMG' ||
        target.tagName === 'VIDEO' ||
        target.closest('a') ||
        target.closest('button') ||
        target.closest('.quoted-note') ||
        target.closest('.event-footer')
      ) {
        return;
      }

      // Navigate to Single Note View
      const router = Router.getInstance();
      const nevent = nip19.neventEncode({ id: note.id });
      router.navigate(`/note/${nevent}`);
    });

    return { element: noteDiv, noteHeader };
  }

  /**
   * Create quote element with embedded quoted notes (NON-BLOCKING)
   * Returns immediately, quotes load in background
   */
  private static createQuoteElement(note: ProcessedNote, depth: number): HTMLElement {
    const { element, noteHeader } = NoteUI.buildNoteStructure(note, {
      cssClass: 'timeline-quote',
      footerLabel: 'Quote',
      renderQuotedNotes: true
    });

    // Store reference for cleanup
    NoteUI.noteHeaders.set(note.id, noteHeader);

    // Render quoted notes using QuotedNoteRenderer (NO AWAIT - fire and forget!)
    const quotedContainer = element.querySelector('.quoted-notes-container');
    if (quotedContainer && note.content.quotedReferences.length > 0) {
      NoteUI.quotedNoteRenderer.renderQuotedNotes(note.content.quotedReferences, quotedContainer);
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

    // Setup collapsible for long notes (only for top-level notes)
    if (depth === 0) {
      NoteUI.setupCollapsible(element);
    }

    return element;
  }

  /**
   * Check if content is long and needs truncation
   */
  private static hasLongContent(content: string): boolean {
    return content.length > 500 || content.split('\n').length > 10;
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

  /**
   * Setup collapsible for a note
   */
  private static setupCollapsible(noteElement: HTMLElement): void {
    // Create wrapper for collapsible content (text + media + quotes)
    const contentEl = noteElement.querySelector('.event-content') as HTMLElement;
    const mediaEl = noteElement.querySelector('.note-media') as HTMLElement;
    const quotesEl = noteElement.querySelector('.quoted-notes-container') as HTMLElement;
    const footerEl = noteElement.querySelector('.event-footer') as HTMLElement;

    if (!contentEl) return;

    // Wrap collapsible content
    const collapsibleWrapper = document.createElement('div');
    collapsibleWrapper.className = 'collapsible-wrapper';

    // Move content, media, quotes into wrapper (before footer)
    const itemsToWrap = [contentEl, mediaEl, quotesEl].filter(el => el);
    itemsToWrap.forEach(el => {
      collapsibleWrapper.appendChild(el);
    });

    // Insert wrapper before footer
    if (footerEl) {
      footerEl.before(collapsibleWrapper);
    } else {
      noteElement.appendChild(collapsibleWrapper);
    }

    // Create Show More button
    const showMoreBtn = document.createElement('button');
    showMoreBtn.className = 'show-more-btn';
    showMoreBtn.textContent = 'Show More';
    showMoreBtn.style.display = 'none'; // Hidden by default

    // Insert button before footer
    if (footerEl) {
      footerEl.before(showMoreBtn);
    } else {
      noteElement.appendChild(showMoreBtn);
    }

    // Toggle on click
    showMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCollapsed = collapsibleWrapper.classList.contains('is-collapsed');

      if (isCollapsed) {
        collapsibleWrapper.classList.remove('is-collapsed');
        collapsibleWrapper.classList.add('is-expanded');
        showMoreBtn.textContent = 'Show Less';
      } else {
        collapsibleWrapper.classList.add('is-collapsed');
        collapsibleWrapper.classList.remove('is-expanded');
        showMoreBtn.textContent = 'Show More';
      }
    });

    // Wait for images/media to load before checking height
    const images = noteElement.querySelectorAll('img, video');
    if (images.length > 0) {
      let loadedCount = 0;
      const totalImages = images.length;

      const checkAllLoaded = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          // All images/videos loaded, now check height
          NoteUI.checkAndCollapseNote(collapsibleWrapper, showMoreBtn);
        }
      };

      images.forEach((media) => {
        if (media.tagName === 'VIDEO') {
          const video = media as HTMLVideoElement;
          // Video uses readyState, not complete
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
            checkAllLoaded();
          } else {
            video.addEventListener('loadeddata', checkAllLoaded);
            video.addEventListener('error', checkAllLoaded);
          }
        } else {
          const img = media as HTMLImageElement;
          if (img.complete) {
            checkAllLoaded();
          } else {
            img.addEventListener('load', checkAllLoaded);
            img.addEventListener('error', checkAllLoaded);
          }
        }
      });
    } else {
      // No images/videos, check immediately
      NoteUI.checkAndCollapseNote(collapsibleWrapper, showMoreBtn);
    }
  }

  /**
   * Check note height and collapse if needed
   * Only collapses if note is significantly taller than threshold
   */
  private static checkAndCollapseNote(wrapperEl: HTMLElement, btnEl: HTMLElement): void {
    const viewportHeight = window.innerHeight;
    const contentHeight = wrapperEl.scrollHeight;

    const collapseThreshold = viewportHeight * NoteUI.COLLAPSIBLE_HEIGHT_THRESHOLD;
    const minDifference = viewportHeight * NoteUI.COLLAPSIBLE_MIN_DIFFERENCE;

    // Only show button if content is SIGNIFICANTLY taller than threshold
    // Example: content must be > 45vh to collapse to 40vh (if min difference is 5vh)
    if (contentHeight > collapseThreshold + minDifference) {
      btnEl.style.display = 'block';
      wrapperEl.classList.add('is-collapsed');
    } else {
      // Not worth collapsing - show full height
      btnEl.style.display = 'none';
    }
  }
}