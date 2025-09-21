/**
 * Timeline Component
 * Displays timeline events with infinite scroll using IntersectionObserver
 */

import { NostrClient, NostrEvent } from '../../services/NostrClient';

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
        <h2>Timeline</h2>
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
      await this.nostrClient.connectToReadRelays();

      // Fetch user's follow list
      this.followingPubkeys = await this.nostrClient.fetchFollowList(this.userPubkey);

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

    const events = await this.nostrClient.fetchTimelineEvents(
      this.followingPubkeys,
      this.showCount,
      undefined,
      (event) => {
        // Real-time event callback - add events as they arrive
        this.addEventToTimeline(event);
      }
    );

    this.events = events;
    this.renderEvents();

    if (events.length < this.showCount) {
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

      const newEvents = await this.nostrClient.fetchTimelineEvents(
        this.followingPubkeys,
        this.showCount,
        since
      );

      if (newEvents.length > 0) {
        // Filter out duplicates and add new events
        const uniqueNewEvents = newEvents.filter(
          newEvent => !this.events.some(existing => existing.id === newEvent.id)
        );

        this.events.push(...uniqueNewEvents);
        this.events.sort((a, b) => b.created_at - a.created_at);
        this.renderEvents();

        if (newEvents.length < this.showCount) {
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
   * Add a single event to timeline (for real-time updates)
   */
  private addEventToTimeline(event: NostrEvent): void {
    // Check if event already exists
    if (this.events.some(existing => existing.id === event.id)) {
      return;
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

    // Render events with memoization-like approach
    this.events.slice(0, this.showCount * 2).forEach((event, index) => {
      const eventElement = this.createEventElement(event, index);
      eventsContainer.appendChild(eventElement);
    });

    // Hide empty state if we have events
    if (this.events.length > 0) {
      this.hideEmptyState();
    }
  }

  /**
   * Create individual event element
   */
  private createEventElement(event: NostrEvent, index: number): HTMLElement {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'timeline-event';
    eventDiv.dataset.eventId = event.id;

    const timeAgo = this.formatTimeAgo(event.created_at);
    const shortPubkey = event.pubkey.slice(0, 8) + '...';

    eventDiv.innerHTML = `
      <div class="event-header">
        <div class="event-author">
          <strong>${shortPubkey}</strong>
        </div>
        <div class="event-time">${timeAgo}</div>
      </div>
      <div class="event-content">
        ${this.formatEventContent(event.content)}
      </div>
      <div class="event-footer">
        <span class="event-kind">Kind ${event.kind}</span>
        <span class="event-id">${event.id.slice(0, 8)}...</span>
      </div>
    `;

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
    this.element.remove();
  }
}