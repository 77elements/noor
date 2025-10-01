/**
 * Event Fetch Service
 * Simple, focused service that fetches events from specified relays
 * Does exactly what it's told - no business logic, no decisions
 * Now uses universal fetchNostrEvents helper
 */

import { SimplePool } from 'nostr-tools/pool';
import type { Event as NostrEvent } from 'nostr-tools';
import { fetchNostrEvents } from '../helpers/fetchNostrEvents';
import { RelayConfig } from './RelayConfig';
import { RelayDiscoveryService } from './RelayDiscoveryService';

export interface FetchRequest {
  eventsPerRelay?: number; // Optional: for count-based fetching
  timeWindowHours?: number; // Optional: for time-based fetching (e.g. 3 hours)
  authors: string[];
  until?: number;
  kinds?: number[];
  userPubkey?: string; // Optional: for diversity control
  maxUserEventsPerRelay?: number; // Optional: limit user's own events per relay
  useOutboundRelays?: boolean; // Optional: include outbound relays from followed users (default: false)
}

export interface FetchResult {
  events: NostrEvent[];
  relayStats: Map<string, number>; // relay -> event count
}

export class EventFetchService {
  private static instance: EventFetchService;
  private pool: SimplePool;
  private relayConfig: RelayConfig;
  private relayDiscovery: RelayDiscoveryService;

  private constructor() {
    this.pool = new SimplePool();
    this.relayConfig = RelayConfig.getInstance();
    this.relayDiscovery = RelayDiscoveryService.getInstance();
  }

  public static getInstance(): EventFetchService {
    if (!EventFetchService.instance) {
      EventFetchService.instance = new EventFetchService();
    }
    return EventFetchService.instance;
  }

  /**
   * Fetch exactly what was requested with optional diversity control
   * Now uses universal fetchNostrEvents helper
   * Automatically gets relays from RelayConfig + RelayDiscoveryService
   */
  public async fetchEvents(request: FetchRequest): Promise<FetchResult> {
    const {
      eventsPerRelay,
      timeWindowHours,
      authors,
      until,
      kinds = [1, 6], // Default: text notes + reposts
      userPubkey,
      maxUserEventsPerRelay,
      useOutboundRelays = false
    } = request;

    // Get relays from config + discovery
    const relays = await this.relayDiscovery.getCombinedRelays(authors, useOutboundRelays);

    const isTimeBased = timeWindowHours !== undefined;
    const diversityMode = userPubkey && maxUserEventsPerRelay !== undefined;

    const allEvents: Map<string, NostrEvent> = new Map();
    const relayStats: Map<string, number> = new Map();

    if (diversityMode && userPubkey && authors.includes(userPubkey)) {
      // Diversity mode: Separate user events from followed user events
      const followedAuthors = authors.filter(pubkey => pubkey !== userPubkey);

      // Fetch from each relay individually with diversity control
      for (const relay of relays) {
        try {
          let relayUniqueCount = 0;

          // 1. Fetch followed users' events (priority)
          if (followedAuthors.length > 0) {
            const followedFilter: NostrFilter = {
              authors: followedAuthors,
              kinds,
              until
            };

            // Add time window or limit based on mode
            if (isTimeBased && timeWindowHours) {
              const timeWindowSeconds = timeWindowHours * 3600;
              followedFilter.since = until ? until - timeWindowSeconds : Math.floor(Date.now() / 1000) - timeWindowSeconds;
            } else if (eventsPerRelay && maxUserEventsPerRelay !== undefined) {
              followedFilter.limit = Math.max(1, eventsPerRelay - maxUserEventsPerRelay);
            } else {
              followedFilter.limit = 10; // Default fallback
            }

            const followedEvents = await this.pool.list([relay], [followedFilter]);
            followedEvents.forEach(event => {
              if (!allEvents.has(event.id)) {
                allEvents.set(event.id, event);
                relayUniqueCount++;
              }
            });
          }

          // 2. Fetch limited user events
          if (maxUserEventsPerRelay > 0) {
            const userFilter: NostrFilter = {
              authors: [userPubkey],
              kinds,
              until
            };

            // Add time window or limit based on mode
            if (isTimeBased && timeWindowHours) {
              const timeWindowSeconds = timeWindowHours * 3600;
              userFilter.since = until ? until - timeWindowSeconds : Math.floor(Date.now() / 1000) - timeWindowSeconds;
            } else {
              userFilter.limit = maxUserEventsPerRelay;
            }

            const userEvents = await this.pool.list([relay], [userFilter]);
            userEvents.forEach(event => {
              if (!allEvents.has(event.id)) {
                allEvents.set(event.id, event);
                relayUniqueCount++;
              }
            });
          }

          relayStats.set(relay, relayUniqueCount);
          console.log(`📡 ${this.shortenRelay(relay)}: ${relayUniqueCount} unique events (diversity mode)`);

        } catch (error) {
          console.error(`❌ ${this.shortenRelay(relay)}: Failed -`, error);
          relayStats.set(relay, 0);
        }
      }
    } else {
      // Standard mode: Use universal fetchNostrEvents helper
      const result = await fetchNostrEvents({
        relays,
        authors,
        kinds,
        until,
        limit: isTimeBased ? undefined : (eventsPerRelay || 10),
        timeWindowHours: isTimeBased ? timeWindowHours : undefined,
        pool: this.pool
      });

      // Map result to our return format
      result.events.forEach(event => allEvents.set(event.id, event));
      relays.forEach(relay => relayStats.set(relay, 0)); // Helper doesn't expose per-relay stats
    }

    const events = Array.from(allEvents.values());
    events.sort((a, b) => b.created_at - a.created_at);

    return { events, relayStats };
  }

  /**
   * Shorten relay URL for logging
   */
  private shortenRelay(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('relay.', '').replace('wss://', '').slice(0, 15);
    } catch {
      return url.slice(0, 15);
    }
  }
}