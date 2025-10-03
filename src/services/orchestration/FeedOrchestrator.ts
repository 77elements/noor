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

type FeedCallback = (events: NostrEvent[]) => void;

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

  public override destroy(): void {
    this.callbacks.clear();
    this.eventCache.clear();
    super.destroy();
    this.debugLogger.info('FeedOrchestrator', 'Destroyed');
  }
}
