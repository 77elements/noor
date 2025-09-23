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
import { NoteUI } from '../ui/NoteUI';
import { InfiniteScroll } from '../ui/InfiniteScroll';

export class TimelineUI {
  private element: HTMLElement;
  private timelineLoader: TimelineLoader;
  private loadMore: LoadMore;
  private userService: UserService;
  private events: NostrEvent[] = [];
  private loading = false;
  private hasMore = true;
  private infiniteScroll: InfiniteScroll;
  private userPubkey: string;
  private followingPubkeys: string[] = [];
  private noteHeaders: Map<string, NoteHeader> = new Map();
  private includeReplies = false;

  constructor(userPubkey: string) {
    this.userPubkey = userPubkey;
    this.timelineLoader = TimelineLoader.getInstance();
    this.loadMore = LoadMore.getInstance();
    this.userService = UserService.getInstance();
    this.element = this.createElement();
    this.infiniteScroll = new InfiniteScroll(() => this.handleLoadMore());
    this.setupInfiniteScroll();
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
   * Setup infinite scroll component
   */
  private setupInfiniteScroll(): void {
    const loadTrigger = this.element.querySelector('.timeline-load-trigger') as HTMLElement;
    if (loadTrigger) {
      this.infiniteScroll.observe(loadTrigger);
    }
  }

  /**
   * Handle load more request from infinite scroll component
   */
  private handleLoadMore(): void {
    if (!this.loading && this.hasMore && this.followingPubkeys.length > 0) {
      this.loadMoreEvents();
    }
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
      await this.renderEvents();

      this.hasMore = result.hasMore;

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

      // console.log(`🔍 LOAD MORE DEBUG: ${result.events.length} total events, ${uniqueNewEvents.length} unique events`);
      // console.log(`🔍 FIRST FEW LOADED:`, result.events.slice(0, 3).map(e => ({
      //   id: e.id.slice(0, 8),
      //   time: new Date(e.created_at * 1000).toLocaleTimeString(),
      //   content: e.content.slice(0, 30)
      // })));

      if (uniqueNewEvents.length > 0) {
        console.log(`📝 Adding ${uniqueNewEvents.length} new events to timeline`);
        this.events.push(...uniqueNewEvents);
        this.events.sort((a, b) => b.created_at - a.created_at);
        await this.appendNewEvents(uniqueNewEvents);
      } else {
        console.log('⚠️ No unique events to add (all were duplicates)');
        console.log(`🔍 EXISTING IDs:`, this.events.slice(0, 5).map(e => e.id.slice(0, 8)));
        console.log(`🔍 NEW IDs:`, result.events.slice(0, 5).map(e => e.id.slice(0, 8)));
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
      await this.renderEvents();
    }
  }

  /**
   * Append new events to timeline without clearing existing DOM
   * Uses batching + streaming for better performance
   */
  private async appendNewEvents(newEvents: NostrEvent[]): Promise<void> {
    const eventsContainer = this.element.querySelector('.timeline-events');
    if (!eventsContainer) return;

    console.log(`➕ APPENDING ${newEvents.length} new events to timeline`);

    const BATCH_SIZE = 3; // Process 3 events at a time
    let processedCount = 0;

    // Process events in batches with streaming
    for (let i = 0; i < newEvents.length; i += BATCH_SIZE) {
      const batch = newEvents.slice(i, i + BATCH_SIZE);

      // console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(newEvents.length / BATCH_SIZE)} (${batch.length} events)`);

      try {
        // Process batch in parallel
        const batchPromises = batch.map((event, index) =>
          this.createNoteElement(event, i + index)
        );

        const batchElements = await Promise.all(batchPromises);

        // Immediately append each element as it's ready (streaming)
        batchElements.forEach(noteElement => {
          eventsContainer.appendChild(noteElement);
          processedCount++;
        });

        // console.log(`✅ Batch complete: ${processedCount}/${newEvents.length} events appended`);

        // Small delay between batches to avoid blocking UI
        if (i + BATCH_SIZE < newEvents.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }

      } catch (error) {
        console.error(`❌ Error processing batch starting at ${i}:`, error);
      }
    }

    console.log(`📱 TIMELINE: Finished appending ${processedCount} events (total: ${this.events.length})`);
  }

  /**
   * Render all events using NoteUI components (full refresh)
   */
  private async renderEvents(): Promise<void> {
    const eventsContainer = this.element.querySelector('.timeline-events');
    if (!eventsContainer) return;

    console.log(`🔄 RENDERING ${this.events.length} events with NoteUI`);

    // Clear existing events
    eventsContainer.innerHTML = '';

    // Process all events in parallel for performance
    const notePromises = this.events.map((event, index) =>
      this.createNoteElement(event, index)
    );

    try {
      const noteElements = await Promise.all(notePromises);
      console.log(`✅ RENDERED ${noteElements.length} notes`);

      // Append all note elements
      noteElements.forEach(noteElement => {
        eventsContainer.appendChild(noteElement);
      });

      // Hide empty state if we have events
      if (this.events.length > 0) {
        this.hideEmptyState();
      }
    } catch (error) {
      console.error('❌ Error rendering notes:', error);
      console.error('Stack trace:', error.stack);
      // Show error state - no fallback needed, NoteUI is single source of truth
      this.showErrorState('Failed to render timeline events');
    }
  }

  /**
   * Legacy render method for fallback
   */
  private renderEventsLegacy(): void {
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
   * Create element for nostr event
   */
  private async createNoteElement(event: NostrEvent, index: number): Promise<HTMLElement> {
    return await NoteUI.createNoteElement(event, index);
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
    const hasLong = false; // TODO: Remove legacy createEventElement method
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