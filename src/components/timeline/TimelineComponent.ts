/**
 * Timeline Component
 * Displays timeline events with infinite scroll using IntersectionObserver
 */

import { NostrClient, NostrEvent } from '../../services/NostrClient';
import { NoteHeader } from '../ui/NoteHeader';

export class TimelineComponent {
  private element: HTMLElement;
  private nostrClient: NostrClient;
  private events: NostrEvent[] = [];
  private loading = false;
  private hasMore = true;
  private showCount = 20; // Start with 20 events like Jumble
  private intersectionObserver: IntersectionObserver | null = null;
  private userPubkey: string;
  private followingPubkeys: string[] = [];
  private noteHeaders: Map<string, NoteHeader> = new Map(); // Track note headers by event ID
  private includeReplies = false; // Default: only original notes

  constructor(userPubkey: string) {
    this.userPubkey = userPubkey;
    this.nostrClient = NostrClient.getInstance();
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
   * Initialize timeline loading
   */
  private async initializeTimeline(): Promise<void> {
    this.loading = true;
    this.showInitialLoading(true);

    try {
      // First connect to relays
      await this.nostrClient.connectToRelays();

      // Fetch user's follow list
      this.followingPubkeys = await this.nostrClient.getUserFollowing(this.userPubkey);

      // Add user's own pubkey to the list
      this.followingPubkeys.push(this.userPubkey);

      console.log(`Following ${this.followingPubkeys.length} users`);

      // Load initial timeline events
      await this.loadInitialEvents();

    } catch (error) {
      console.error('Failed to initialize timeline:', error);
      this.showError('Failed to load timeline. Please check your connection.');
    } finally {
      this.loading = false;
      this.showInitialLoading(false);
    }
  }

  /**
   * Load initial timeline events
   */
  private async loadInitialEvents(): Promise<void> {
    if (this.followingPubkeys.length === 0) {
      this.showEmptyState();
      return;
    }

    const allEvents = await this.nostrClient.fetchTimelineEvents(
      this.followingPubkeys,
      this.showCount * 2, // Fetch more to account for filtering
      undefined,
      (event) => {
        // Real-time event callback - add events as they arrive
        this.addEventToTimeline(event);
      }
    );

    // Filter events based on reply preference
    const filteredEvents = this.filterEventsByReplyPreference(allEvents);

    console.log(`Loaded ${allEvents.length} events, showing ${filteredEvents.length} (includeReplies: ${this.includeReplies})`);

    this.events = filteredEvents;
    this.renderEvents();

    if (filteredEvents.length < this.showCount) {
      this.hasMore = false;
    }
  }

  /**
   * Load more events for infinite scroll
   */
  private async loadMoreEvents(): Promise<void> {
    if (this.loading || !this.hasMore || this.followingPubkeys.length === 0) return;

    this.loading = true;
    this.showMoreLoading(true);

    try {
      const oldestEvent = this.events[this.events.length - 1];
      const since = oldestEvent ? oldestEvent.created_at - 1 : undefined;

      const allNewEvents = await this.nostrClient.fetchTimelineEvents(
        this.followingPubkeys,
        this.showCount * 2, // Fetch more to account for filtering
        since
      );

      if (allNewEvents.length > 0) {
        // Filter new events based on reply preference
        const filteredNewEvents = this.filterEventsByReplyPreference(allNewEvents);

        // Filter out duplicates and add new events
        const uniqueNewEvents = filteredNewEvents.filter(
          newEvent => !this.events.some(existing => existing.id === newEvent.id)
        );

        console.log(`Loaded ${allNewEvents.length} more events, showing ${uniqueNewEvents.length} new (includeReplies: ${this.includeReplies})`);

        this.events.push(...uniqueNewEvents);
        this.events.sort((a, b) => b.created_at - a.created_at);
        this.renderEvents();

        if (filteredNewEvents.length < this.showCount) {
          this.hasMore = false;
        }
      } else {
        this.hasMore = false;
      }

    } catch (error) {
      console.error('Failed to load more events:', error);
    } finally {
      this.loading = false;
      this.showMoreLoading(false);
    }
  }

  /**
   * Filter events based on reply preference
   */
  private filterEventsByReplyPreference(events: NostrEvent[]): NostrEvent[] {
    if (this.includeReplies) {
      // Show all events (original notes + replies)
      return events;
    } else {
      // Show only original notes (filter out replies)
      return events.filter(event => !this.isReply(event));
    }
  }

  /**
   * Check if an event is a reply
   */
  private isReply(event: NostrEvent): boolean {
    // An event is considered a reply if it has 'e' tags (references to other events)
    // or 'reply' tags pointing to other events
    return event.tags.some(tag =>
      tag[0] === 'e' || // Event reference tag
      (tag[0] === 'p' && tag[3] === 'reply') // Reply to user tag
    );
  }

  /**
   * Add a single event to timeline (for real-time updates)
   */
  private addEventToTimeline(event: NostrEvent): void {
    // Check if event already exists
    if (this.events.some(existing => existing.id === event.id)) {
      return;
    }

    // Apply reply filter to real-time events too
    const filteredEvents = this.filterEventsByReplyPreference([event]);
    if (filteredEvents.length === 0) {
      return; // Event filtered out
    }

    this.events.unshift(event);
    this.events.sort((a, b) => b.created_at - a.created_at);

    // Re-render if not too many events (performance optimization)
    if (this.events.length < 200) {
      this.renderEvents();
    }
  }

  /**
   * Render timeline events
   */
  private renderEvents(): void {
    const eventsContainer = this.element.querySelector('.timeline-events');
    if (!eventsContainer) return;

    // Clear existing events
    eventsContainer.innerHTML = '';

    // Get filtered events based on current preference
    const filteredEvents = this.filterEventsByReplyPreference(this.events);

    // Render filtered events
    filteredEvents.slice(0, this.showCount * 2).forEach((event, index) => {
      const eventElement = this.createEventElement(event, index);
      eventsContainer.appendChild(eventElement);
    });

    // Hide empty state if we have events
    if (filteredEvents.length > 0) {
      this.hideEmptyState();
    }
  }

  /**
   * Create individual event element using reusable NoteHeader component
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

    // Don't refresh - just re-filter existing events
    const filteredEvents = this.filterEventsByReplyPreference(this.events);
    console.log(`Re-filtering existing ${this.events.length} events, showing ${filteredEvents.length} (includeReplies: ${this.includeReplies})`);

    this.renderEvents();
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