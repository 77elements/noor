/**
 * Timeline UI
 * Pure UI component for displaying timeline events
 * Uses TimelineLoader and LoadMore for data fetching
 */

import type { Event as NostrEvent } from 'nostr-tools';
import { TimelineLoader } from '../../services/TimelineLoader';
import { LoadMore } from '../../services/LoadMore';
import { UserService } from '../../services/UserService';
import { NoteHeader } from '../ui/NoteHeader';
import { NoteContentProcessing, ProcessedNote } from '../content/NoteContentProcessing';

export class TimelineUI {
  private element: HTMLElement;
  private timelineLoader: TimelineLoader;
  private loadMore: LoadMore;
  private userService: UserService;
  private noteProcessor: NoteContentProcessing;
  private events: NostrEvent[] = [];
  private processedNotes: ProcessedNote[] = [];
  private loading = false;
  private hasMore = true;
  private intersectionObserver: IntersectionObserver | null = null;
  private userPubkey: string;
  private followingPubkeys: string[] = [];
  private noteHeaders: Map<string, NoteHeader> = new Map();
  private includeReplies = false;

  constructor(userPubkey: string) {
    this.userPubkey = userPubkey;
    this.timelineLoader = TimelineLoader.getInstance();
    this.loadMore = LoadMore.getInstance();
    this.userService = UserService.getInstance();
    this.noteProcessor = NoteContentProcessing.getInstance();
    this.element = this.createElement();
    this.setupIntersectionObserver();
    this.initializeTimeline();
  }

  /**
   * Create the timeline container
   */
  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'timeline-component';
    container.innerHTML = `
      <div class="timeline-header">
        <div class="timeline-view-selector">
          <select class="timeline-select">
            <option value="latest">Latest</option>
            <option value="latest-replies">Latest + Replies</option>
          </select>
        </div>
        <div class="timeline-controls">
          <button class="refresh-btn" type="button">Refresh</button>
        </div>
      </div>

      <div class="timeline-content">
        <div class="timeline-loading initial-loading">
          <div class="loading-spinner"></div>
          <p>Loading timeline...</p>
        </div>

        <div class="timeline-events"></div>

        <div class="timeline-load-trigger" style="height: 20px;"></div>

        <div class="timeline-loading more-loading" style="display: none;">
          <div class="loading-spinner"></div>
          <p>Loading more events...</p>
        </div>
      </div>

      <div class="timeline-empty" style="display: none;">
        <h3>No events found</h3>
        <p>Follow some users or check your relay connections.</p>
      </div>
    `;

    // Setup refresh button
    const refreshBtn = container.querySelector('.refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', this.handleRefresh.bind(this));
    }

    // Setup timeline select dropdown
    const timelineSelect = container.querySelector('.timeline-select');
    if (timelineSelect) {
      timelineSelect.addEventListener('change', this.handleViewChange.bind(this));
    }

    return container;
  }

  /**
   * Setup IntersectionObserver for infinite scroll
   */
  private setupIntersectionObserver(): void {
    const loadTrigger = this.element.querySelector('.timeline-load-trigger');
    if (!loadTrigger) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.loading && this.hasMore) {
            this.loadMoreEvents();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before reaching the trigger
        threshold: 0.1
      }
    );

    this.intersectionObserver.observe(loadTrigger);
  }

  /**
   * Initialize timeline loading - pure UI orchestration
   */
  private async initializeTimeline(): Promise<void> {
    this.loading = true;
    this.showInitialLoading(true);

    try {
      // Get following list from UserService
      this.followingPubkeys = await this.userService.getUserFollowing(this.userPubkey);

      console.log(`📱 TIMELINE UI: Following ${this.followingPubkeys.length} users`);

      if (this.followingPubkeys.length <= 1) {
        this.showError('No following list found. Please follow some users first.');
        return;
      }

      // Use TimelineLoader service (no userPubkey needed since user not in following list)
      const result = await this.timelineLoader.loadInitialTimeline({
        userPubkey: '', // Empty since user not included in timeline
        followingPubkeys: this.followingPubkeys,
        includeReplies: this.includeReplies
      });

      this.events = result.events;
      await this.processAndRenderEvents();

      if (result.events.length < 20) {
        this.hasMore = false;
      }

      console.log(`📱 TIMELINE UI: Loaded ${result.events.length} events from ${result.relaysUsed} relays`);

    } catch (error) {
      console.error('Failed to initialize timeline:', error);
      this.showError('Failed to load timeline. Please check your connection.');
    } finally {
      this.loading = false;
      this.showInitialLoading(false);
    }
  }


  /**
   * Load more events for infinite scroll - pure UI orchestration
   */
  private async loadMoreEvents(): Promise<void> {
    console.log('🔄 INFINITE SCROLL TRIGGERED');

    if (this.loading || !this.hasMore || this.followingPubkeys.length === 0) {
      console.log('❌ Infinite scroll blocked:', { loading: this.loading, hasMore: this.hasMore });
      return;
    }

    this.loading = true;
    this.showMoreLoading(true);

    try {
      const oldestEvent = this.events[this.events.length - 1];
      if (!oldestEvent) {
        console.log('⚠️ No oldest event found');
        this.hasMore = false;
        return;
      }

      console.log(`📅 Loading events older than: ${new Date(oldestEvent.created_at * 1000).toISOString()}`);

      // Use LoadMore service (no userPubkey needed since user not in following list)
      const result = await this.loadMore.loadMoreEvents({
        userPubkey: '', // Empty since user not included in timeline
        followingPubkeys: this.followingPubkeys,
        oldestEventTimestamp: oldestEvent.created_at,
        includeReplies: this.includeReplies
      });

      // Filter out duplicates and add new events
      const uniqueNewEvents = result.events.filter(
        newEvent => !this.events.some(existing => existing.id === newEvent.id)
      );

      if (uniqueNewEvents.length > 0) {
        console.log(`📝 Adding ${uniqueNewEvents.length} new events to timeline`);
        this.events.push(...uniqueNewEvents);
        this.events.sort((a, b) => b.created_at - a.created_at);
        await this.processAndRenderEvents();
      } else {
        console.log('⚠️ No unique events to add (all were duplicates)');
      }

      this.hasMore = result.hasMore;
      console.log(`📱 LOAD MORE UI: ${uniqueNewEvents.length} new events, hasMore: ${this.hasMore}`);

    } catch (error) {
      console.error('💥 INFINITE SCROLL ERROR:', error);
    } finally {
      this.loading = false;
      this.showMoreLoading(false);
    }
  }


  /**
   * Add a single event to timeline (for real-time updates)
   */
  private async addEventToTimeline(event: NostrEvent): Promise<void> {
    // Check if event already exists
    if (this.events.some(existing => existing.id === event.id)) {
      return;
    }

    this.events.unshift(event);
    this.events.sort((a, b) => b.created_at - a.created_at);

    // Re-render if not too many events (performance optimization)
    if (this.events.length < 200) {
      await this.processAndRenderEvents();
    }
  }

  /**
   * Process all events through NoteContentProcessing and render
   */
  private async processAndRenderEvents(): Promise<void> {
    console.log(`🔄 PROCESSING ${this.events.length} events through NoteContentProcessing`);

    // Process all events in parallel for performance
    const processingPromises = this.events.map(event =>
      this.noteProcessor.processNote(event)
    );

    try {
      this.processedNotes = await Promise.all(processingPromises);
      console.log(`✅ PROCESSED ${this.processedNotes.length} notes`);
      this.renderProcessedNotes();
    } catch (error) {
      console.error('❌ Error processing notes:', error);
      console.error('Stack trace:', error.stack);
      // Fallback to original render method
      this.renderEvents();
    }
  }

  /**
   * Render processed notes with enhanced display
   */
  private renderProcessedNotes(): void {
    const eventsContainer = this.element.querySelector('.timeline-events');
    if (!eventsContainer) return;

    // Clear existing events
    eventsContainer.innerHTML = '';

    // Render all processed notes
    this.processedNotes.forEach((note, index) => {
      const noteElement = this.createProcessedNoteElement(note, index);
      eventsContainer.appendChild(noteElement);
    });

    // Hide empty state if we have events
    if (this.processedNotes.length > 0) {
      this.hideEmptyState();
    }
  }

  /**
   * Legacy render method for fallback
   */
  private renderEvents(): void {
    const eventsContainer = this.element.querySelector('.timeline-events');
    if (!eventsContainer) return;

    // Clear existing events
    eventsContainer.innerHTML = '';

    // Render all events (filtering already done in services)
    this.events.forEach((event, index) => {
      const eventElement = this.createEventElement(event, index);
      eventsContainer.appendChild(eventElement);
    });

    // Hide empty state if we have events
    if (this.events.length > 0) {
      this.hideEmptyState();
    }
  }

  /**
   * Create element for processed note with enhanced display
   */
  private createProcessedNoteElement(note: ProcessedNote, index: number): HTMLElement {
    const noteDiv = document.createElement('div');
    noteDiv.className = `timeline-event timeline-${note.type}`;
    noteDiv.dataset.eventId = note.id;

    // Handle different note types
    switch (note.type) {
      case 'repost':
        return this.createRepostElement(note);
      case 'quote':
        return this.createQuoteElement(note);
      default:
        return this.createOriginalNoteElement(note);
    }
  }

  /**
   * Create repost element with "User reposted" display
   */
  private createRepostElement(note: ProcessedNote): HTMLElement {
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
    const originalNoteElement = this.createOriginalNoteElement(note);

    repostDiv.appendChild(repostHeader);
    repostDiv.appendChild(originalNoteElement);

    return repostDiv;
  }

  /**
   * Create quote element with quoted content
   */
  private createQuoteElement(note: ProcessedNote): HTMLElement {
    // For now, treat quotes like original notes
    // TODO: Add quoted content display
    return this.createOriginalNoteElement(note);
  }

  /**
   * Create original note element
   */
  private createOriginalNoteElement(note: ProcessedNote): HTMLElement {
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
    this.noteHeaders.set(note.id, noteHeader);

    // Check for long content
    const hasLong = this.hasLongContent(note.content.text);
    const contentClass = hasLong ? 'event-content has-long-content' : 'event-content';

    // Create note structure with processed content
    noteDiv.innerHTML = `
      <div class="event-header-container">
        <!-- Note header will be inserted here -->
      </div>
      <div class="${contentClass}">
        ${note.content.html}
      </div>
      ${this.renderMediaContent(note.content.media)}
      ${this.renderLinks(note.content.links)}
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
   * Render media content (images, videos)
   */
  private renderMediaContent(media: ProcessedNote['content']['media']): string {
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
  private renderLinks(links: ProcessedNote['content']['links']): string {
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
   * Legacy method - create individual event element using reusable NoteHeader component
   */
  private createEventElement(event: NostrEvent, index: number): HTMLElement {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'timeline-event';
    eventDiv.dataset.eventId = event.id;

    // Create note header component
    const noteHeader = new NoteHeader({
      pubkey: event.pubkey,
      timestamp: event.created_at,
      size: 'medium',
      showVerification: true,
      showTimestamp: true,
      onClick: (pubkey: string) => {
        // Handle profile click (can be extended later)
        console.log('Profile clicked:', pubkey);
      }
    });

    // Store reference for cleanup
    this.noteHeaders.set(event.id, noteHeader);

    // Check for long content
    const hasLong = this.hasLongContent(event.content);
    const contentClass = hasLong ? 'event-content has-long-content' : 'event-content';

    // Create event structure
    eventDiv.innerHTML = `
      <div class="event-header-container">
        <!-- Note header will be inserted here -->
      </div>
      <div class="${contentClass}">
        ${this.formatEventContent(event.content)}
      </div>
      <div class="event-footer">
        <span class="event-kind">Kind ${event.kind}</span>
        <span class="event-id">${event.id.slice(0, 8)}...</span>
      </div>
    `;

    // Mount note header
    const headerContainer = eventDiv.querySelector('.event-header-container');
    if (headerContainer) {
      headerContainer.appendChild(noteHeader.getElement());
    }

    return eventDiv;
  }

  /**
   * Format event content (basic text processing)
   */
  private formatEventContent(content: string): string {
    // Basic HTML escaping
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // Convert line breaks
    return escaped.replace(/\n/g, '<br>');
  }

  /**
   * Check if content has long unbreakable strings (like nevent IDs)
   */
  private hasLongContent(content: string): boolean {
    // Check for words longer than 50 characters (likely nostr IDs)
    const words = content.split(/\s+/);
    return words.some(word => word.length > 50);
  }

  /**
   * Format timestamp to human readable time
   */
  private formatTimeAgo(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

    return new Date(timestamp * 1000).toLocaleDateString();
  }

  /**
   * Handle timeline view change
   */
  private async handleViewChange(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const selectedView = select.value;

    console.log(`Timeline view changed to: ${selectedView}`);

    // Update include replies flag
    this.includeReplies = selectedView === 'latest-replies';

    // Reload timeline with new filter setting
    console.log(`Reloading timeline with includeReplies: ${this.includeReplies}`);
    await this.handleRefresh();
  }

  /**
   * Handle refresh button click
   */
  private async handleRefresh(): Promise<void> {
    this.events = [];
    this.hasMore = true;
    this.showCount = 20;

    const eventsContainer = this.element.querySelector('.timeline-events');
    if (eventsContainer) {
      eventsContainer.innerHTML = '';
    }

    await this.initializeTimeline();
  }

  /**
   * Show/hide loading states
   */
  private showInitialLoading(show: boolean): void {
    const loading = this.element.querySelector('.initial-loading');
    if (loading) {
      loading.style.display = show ? 'block' : 'none';
    }
  }

  private showMoreLoading(show: boolean): void {
    const loading = this.element.querySelector('.more-loading');
    if (loading) {
      loading.style.display = show ? 'block' : 'none';
    }
  }

  private showEmptyState(): void {
    const empty = this.element.querySelector('.timeline-empty');
    const content = this.element.querySelector('.timeline-content');
    if (empty && content) {
      empty.style.display = 'block';
      content.style.display = 'none';
    }
  }

  private hideEmptyState(): void {
    const empty = this.element.querySelector('.timeline-empty');
    const content = this.element.querySelector('.timeline-content');
    if (empty && content) {
      empty.style.display = 'none';
      content.style.display = 'block';
    }
  }

  private showError(message: string): void {
    const eventsContainer = this.element.querySelector('.timeline-events');
    if (eventsContainer) {
      eventsContainer.innerHTML = `
        <div class="timeline-error">
          <h3>Error</h3>
          <p>${message}</p>
          <button onclick="window.location.reload()">Retry</button>
        </div>
      `;
    }
  }

  /**
   * Get the DOM element
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    // Cleanup all note headers
    this.noteHeaders.forEach(noteHeader => {
      noteHeader.destroy();
    });
    this.noteHeaders.clear();

    this.element.remove();
  }
}