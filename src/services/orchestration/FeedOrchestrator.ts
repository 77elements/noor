/**
 * FeedOrchestrator - Timeline Feed Management
 * Handles all timeline feed loading (initial, load more, new notes)
 *
 * @orchestrator FeedOrchestrator
 * @purpose Coordinate timeline feed loading and distribution
 * @used-by TimelineUI
 *
 * Architecture:
 * - Replaces TimelineLoader + LoadMore + parts of EventFetchService
 * - Uses NostrTransport for all relay communication
 * - Caches and deduplicates events
 * - Distributes events to registered components (TimelineUI)
 */

import type { Event as NostrEvent, Filter as NostrFilter } from 'nostr-tools';
import { Orchestrator } from './Orchestrator';
import { NostrTransport } from '../transport/NostrTransport';
import { RelayConfig } from '../RelayConfig';
import { RelayDiscoveryService } from '../RelayDiscoveryService';
import { DebugLogger } from '../../components/debug/DebugLogger';

export interface FeedLoadRequest {
  followingPubkeys: string[];
  includeReplies: boolean;
  timeWindowHours?: number;
  until?: number;
}

export interface FeedLoadResult {
  events: NostrEvent[];
  hasMore: boolean;
}

export interface NewNotesInfo {
  count: number;
  authorPubkeys: string[]; // Unique pubkeys of new note authors (max 4, newest first)
}

type FeedCallback = (events: NostrEvent[]) => void;
type NewNotesCallback = (info: NewNotesInfo) => void;

export class FeedOrchestrator extends Orchestrator {
  private static instance: FeedOrchestrator;
  private transport: NostrTransport;
  private relayConfig: RelayConfig;
  private relayDiscovery: RelayDiscoveryService;
  private debugLogger: DebugLogger;

  /** Cached events (deduplicated) */
  private eventCache: Map<string, NostrEvent> = new Map();

  /** Registered callbacks for event updates */
  private callbacks: Set<FeedCallback> = new Set();

  /** New notes polling */
  private pollingInterval: number = 60000; // 60 seconds
  private pollingIntervalId: number | null = null;
  private lastCheckedTimestamp: number = 0;
  private newNotesCallback: NewNotesCallback | null = null;
  private pollingFollowingPubkeys: string[] = [];
  private pollingIncludeReplies: boolean = false;
  private lastFoundCount: number = 0;

  private constructor() {
    super('FeedOrchestrator');
    this.transport = NostrTransport.getInstance();
    this.relayConfig = RelayConfig.getInstance();
    this.relayDiscovery = RelayDiscoveryService.getInstance();
    this.debugLogger = DebugLogger.getInstance();
    this.debugLogger.info('FeedOrchestrator', 'Initialized');
  }

  public static getInstance(): FeedOrchestrator {
    if (!FeedOrchestrator.instance) {
      FeedOrchestrator.instance = new FeedOrchestrator();
    }
    return FeedOrchestrator.instance;
  }

  /**
   * Register callback for feed updates
   */
  public registerCallback(callback: FeedCallback): void {
    this.callbacks.add(callback);
  }

  /**
   * Unregister callback
   */
  public unregisterCallback(callback: FeedCallback): void {
    this.callbacks.delete(callback);
  }

  /**
   * Load initial timeline feed
   */
  public async loadInitialFeed(request: FeedLoadRequest): Promise<FeedLoadResult> {
    const { followingPubkeys, includeReplies, timeWindowHours = 1 } = request;

    this.debugLogger.info(
      'FeedOrchestrator',
      `Loading initial feed for ${followingPubkeys.length} users (${timeWindowHours}h window)`
    );

    try {
      // Get relays (no outbound relays to avoid timeouts)
      const relays = await this.relayDiscovery.getCombinedRelays(followingPubkeys, false);

      // Build filter
      const filters: NostrFilter[] = [{
        authors: followingPubkeys,
        kinds: [1, 6], // Text notes + reposts
        limit: 50
      }];

      // Add time window
      if (timeWindowHours) {
        const timeWindowSeconds = timeWindowHours * 3600;
        const now = Math.floor(Date.now() / 1000);
        filters[0].since = now - timeWindowSeconds;
      }

      // Fetch events via Transport
      const events = await this.transport.fetch(relays, filters);

      // Deduplicate and cache
      events.forEach(event => {
        if (!this.eventCache.has(event.id)) {
          this.eventCache.set(event.id, event);
        }
      });

      // Filter replies if needed
      const filteredEvents = includeReplies ? events : this.filterReplies(events);

      // Sort by timestamp (newest first)
      filteredEvents.sort((a, b) => b.created_at - a.created_at);

      this.debugLogger.info(
        'FeedOrchestrator',
        `Loaded ${filteredEvents.length} events (${events.length} total, ${this.eventCache.size} cached)`
      );

      return {
        events: filteredEvents,
        hasMore: true
      };
    } catch (error) {
      this.debugLogger.error('FeedOrchestrator', `Initial load failed: ${error}`);
      return {
        events: [],
        hasMore: false
      };
    }
  }

  /**
   * Load more events (infinite scroll)
   */
  public async loadMore(request: FeedLoadRequest & { until: number }): Promise<FeedLoadResult> {
    const { followingPubkeys, includeReplies, until, timeWindowHours = 3 } = request;

    this.debugLogger.info(
      'FeedOrchestrator',
      `Loading more events before ${new Date(until * 1000).toISOString()}`
    );

    try {
      // Get relays
      const relays = await this.relayDiscovery.getCombinedRelays(followingPubkeys, false);

      // Build filter
      const filters: NostrFilter[] = [{
        authors: followingPubkeys,
        kinds: [1, 6],
        until: until - 1, // Start 1 second before to avoid overlap
        limit: 50
      }];

      // Add time window
      if (timeWindowHours) {
        const timeWindowSeconds = timeWindowHours * 3600;
        filters[0].since = until - timeWindowSeconds;
      }

      // Fetch events
      const events = await this.transport.fetch(relays, filters);

      // Deduplicate and cache
      events.forEach(event => {
        if (!this.eventCache.has(event.id)) {
          this.eventCache.set(event.id, event);
        }
      });

      // Filter replies if needed
      const filteredEvents = includeReplies ? events : this.filterReplies(events);

      // Sort by timestamp
      filteredEvents.sort((a, b) => b.created_at - a.created_at);

      this.debugLogger.info(
        'FeedOrchestrator',
        `Loaded ${filteredEvents.length} more events (${events.length} total)`
      );

      return {
        events: filteredEvents,
        hasMore: true // Always more history on Nostr
      };
    } catch (error) {
      this.debugLogger.error('FeedOrchestrator', `Load more failed: ${error}`);
      return {
        events: [],
        hasMore: false
      };
    }
  }

  /**
   * Filter out replies
   */
  private filterReplies(events: NostrEvent[]): NostrEvent[] {
    return events.filter(event => {
      // Always allow reposts (kind 6)
      if (event.kind === 6) return true;

      const content = event.content.trim();

      // Content-based detection: starts with @username or npub
      if (content.match(/^@\w+/) || content.startsWith('npub1')) {
        return false;
      }

      // Tag-based detection: has 'e' tags (reply to event)
      const eTags = event.tags.filter(tag => tag[0] === 'e');
      if (eTags.length > 0) {
        return false;
      }

      return true;
    });
  }

  /**
   * Clear cache (for refresh)
   */
  public clearCache(): void {
    this.eventCache.clear();
    this.debugLogger.info('FeedOrchestrator', 'Cache cleared');
  }

  // Orchestrator interface implementations (unused for now, but required by base class)

  public onui(data: any): void {
    // Handle UI actions (future: real-time subscriptions)
  }

  public onopen(relay: string): void {
    this.debugLogger.info('FeedOrchestrator', `Relay opened: ${relay}`);
  }

  public onmessage(relay: string, event: NostrEvent): void {
    // Handle incoming events from subscriptions (future)
    if (!this.eventCache.has(event.id)) {
      this.eventCache.set(event.id, event);
      // Notify callbacks
      this.callbacks.forEach(callback => callback([event]));
    }
  }

  public onerror(relay: string, error: Error): void {
    this.debugLogger.error('FeedOrchestrator', `Relay error (${relay}): ${error.message}`);
  }

  public onclose(relay: string): void {
    this.debugLogger.info('FeedOrchestrator', `Relay closed: ${relay}`);
  }

  /**
   * Start polling for new notes
   * @param followingPubkeys - List of pubkeys to check for new notes
   * @param lastLoadedTimestamp - Timestamp of the most recent note in timeline
   * @param callback - Function to call when new notes are detected
   * @param includeReplies - Whether to include reply notes
   * @param delayMs - Delay before starting polling (default: 10000ms)
   */
  public startPolling(
    followingPubkeys: string[],
    lastLoadedTimestamp: number,
    callback: NewNotesCallback,
    includeReplies: boolean = false,
    delayMs: number = 10000
  ): void {
    // Stop any existing polling
    this.stopPolling();

    this.pollingFollowingPubkeys = followingPubkeys;
    this.lastCheckedTimestamp = lastLoadedTimestamp;
    this.newNotesCallback = callback;
    this.pollingIncludeReplies = includeReplies;

    this.debugLogger.info(
      'FeedOrchestrator',
      `Starting polling in ${delayMs / 1000}s (includeReplies: ${includeReplies})`
    );

    // Start polling after delay
    setTimeout(() => {
      this.poll(); // First poll immediately after delay
      this.pollingIntervalId = window.setInterval(() => this.poll(), this.pollingInterval);
    }, delayMs);
  }

  /**
   * Stop polling for new notes
   */
  public stopPolling(): void {
    if (this.pollingIntervalId !== null) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
      this.debugLogger.info('FeedOrchestrator', 'Polling stopped');
    }
  }

  /**
   * Reset last checked timestamp (call this when timeline is refreshed)
   */
  public resetPollingTimestamp(newTimestamp: number): void {
    this.lastCheckedTimestamp = newTimestamp;
    this.lastFoundCount = 0;
    this.debugLogger.info(
      'FeedOrchestrator',
      `Polling timestamp reset to ${new Date(newTimestamp * 1000).toISOString()}`
    );
  }

  /**
   * Poll relays for new notes
   */
  private async poll(): Promise<void> {
    if (!this.newNotesCallback || this.pollingFollowingPubkeys.length === 0) {
      return;
    }

    try {
      const relays = this.transport.getReadRelays();
      if (relays.length === 0) {
        this.debugLogger.warn('FeedOrchestrator', 'No read relays configured for polling');
        return;
      }

      const now = Math.floor(Date.now() / 1000);

      // Query for new notes since last check
      const filters = [{
        kinds: [1, 6], // Text notes + reposts
        authors: this.pollingFollowingPubkeys,
        since: this.lastCheckedTimestamp + 1,
        until: now,
        limit: 100
      }];

      const events = await this.transport.fetch(relays, filters);

      // Filter replies if needed
      const filteredEvents = this.pollingIncludeReplies ? events : this.filterReplies(events);

      if (filteredEvents.length > 0) {
        // Only log when count changes - compact format
        if (filteredEvents.length !== this.lastFoundCount) {
          this.debugLogger.info(
            'FeedOrchestrator',
            `🔔 ${filteredEvents.length} new note${filteredEvents.length !== 1 ? 's' : ''} available`
          );
          this.lastFoundCount = filteredEvents.length;
        }

        // Extract unique author pubkeys (newest first, max 4)
        const uniqueAuthors: string[] = [];
        const seen = new Set<string>();

        filteredEvents.sort((a, b) => b.created_at - a.created_at);

        for (const event of filteredEvents) {
          if (!seen.has(event.pubkey)) {
            uniqueAuthors.push(event.pubkey);
            seen.add(event.pubkey);
            if (uniqueAuthors.length >= 4) break;
          }
        }

        const info: NewNotesInfo = {
          count: filteredEvents.length,
          authorPubkeys: uniqueAuthors
        };

        // Notify callback
        this.newNotesCallback(info);
      } else {
        this.lastFoundCount = 0;
      }

    } catch (error) {
      this.debugLogger.error('FeedOrchestrator', `Polling error: ${error}`);
    }
  }

  public override destroy(): void {
    this.stopPolling();
    this.callbacks.clear();
    this.eventCache.clear();
    super.destroy();
    this.debugLogger.info('FeedOrchestrator', 'Destroyed');
  }
}
