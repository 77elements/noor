/**
 * Event Fetch Service
 * Simple, focused service that fetches events from specified relays
 * Does exactly what it's told - no business logic, no decisions
 */

import { SimplePool } from 'nostr-tools/pool';
import type { Event as NostrEvent, Filter as NostrFilter } from 'nostr-tools';

export interface FetchRequest {
  eventsPerRelay?: number; // Optional: for count-based fetching
  timeWindowHours?: number; // Optional: for time-based fetching (e.g. 3 hours)
  relays: string[];
  authors: string[];
  until?: number;
  kinds?: number[];
  userPubkey?: string; // Optional: for diversity control
  maxUserEventsPerRelay?: number; // Optional: limit user's own events per relay
}

export interface FetchResult {
  events: NostrEvent[];
  relayStats: Map<string, number>; // relay -> event count
}

export class EventFetchService {
  private static instance: EventFetchService;
  private pool: SimplePool;

  private constructor() {
    this.pool = new SimplePool();
  }

  public static getInstance(): EventFetchService {
    if (!EventFetchService.instance) {
      EventFetchService.instance = new EventFetchService();
    }
    return EventFetchService.instance;
  }

  /**
   * Fetch exactly what was requested with optional diversity control
   */
  public async fetchEvents(request: FetchRequest): Promise<FetchResult> {
    const {
      eventsPerRelay,
      timeWindowHours,
      relays,
      authors,
      until,
      kinds = [1, 6], // Default: text notes + reposts
      userPubkey,
      maxUserEventsPerRelay
    } = request;

    const isTimeBased = timeWindowHours !== undefined;
    const diversityMode = userPubkey && maxUserEventsPerRelay !== undefined;

    if (isTimeBased) {
      // console.log(`🕐 FETCH SERVICE: Events from last ${timeWindowHours}h from ${relays.length} relays ${diversityMode ? '(diversity mode)' : ''}`);
    } else {
      // console.log(`🔧 FETCH SERVICE: ${eventsPerRelay} events per relay from ${relays.length} relays ${diversityMode ? '(diversity mode)' : ''}`);
    }

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
      // Standard mode: Single filter for all authors
      const filter: NostrFilter = {
        authors,
        kinds,
        until
      };

      // Add limit for count-based OR since for time-based
      if (isTimeBased && timeWindowHours) {
        const timeWindowSeconds = timeWindowHours * 3600;
        filter.since = until ? until - timeWindowSeconds : Math.floor(Date.now() / 1000) - timeWindowSeconds;
        console.log(`🕐 Time window: ${new Date((filter.since || 0) * 1000).toISOString()} to ${new Date((until || Date.now() / 1000) * 1000).toISOString()}`);
      } else if (eventsPerRelay) {
        filter.limit = eventsPerRelay;
      } else {
        filter.limit = 10; // Default fallback
      }

      // Fetch from each relay individually
      for (const relay of relays) {
        try {
          const events = await this.pool.list([relay], [filter]);

          // Add unique events
          let uniqueCount = 0;
          events.forEach(event => {
            if (!allEvents.has(event.id)) {
              allEvents.set(event.id, event);
              uniqueCount++;
            }
          });

          relayStats.set(relay, uniqueCount);
          console.log(`📡 ${this.shortenRelay(relay)}: ${events.length} events (${uniqueCount} unique)`);

        } catch (error) {
          console.error(`❌ ${this.shortenRelay(relay)}: Failed -`, error);
          relayStats.set(relay, 0);
        }
      }
    }

    const events = Array.from(allEvents.values());
    events.sort((a, b) => b.created_at - a.created_at);

    // console.log(`✅ FETCH SERVICE: ${events.length} total unique events from ${relays.length} relays`);

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