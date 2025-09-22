/**
 * Load More
 * Handles infinite scroll loading strategy and decisions
 * Tells EventFetch exactly what to do for loading additional timeline events
 */

import type { Event as NostrEvent } from 'nostr-tools';
import { EventFetchService } from './EventFetchService';
import { RelayConfig } from './RelayConfig';
import { RelayDiscoveryService } from './RelayDiscoveryService';

export interface LoadMoreRequest {
  userPubkey: string;
  followingPubkeys: string[];
  oldestEventTimestamp: number;
  includeReplies: boolean;
}

export interface LoadMoreResult {
  events: NostrEvent[];
  hasMore: boolean;
  totalFetched: number;
  relaysUsed: number;
}

export class LoadMore {
  private static instance: LoadMore;
  private eventFetch: EventFetchService;
  private relayConfig: RelayConfig;
  private relayDiscovery: RelayDiscoveryService;

  private constructor() {
    this.eventFetch = EventFetchService.getInstance();
    this.relayConfig = RelayConfig.getInstance();
    this.relayDiscovery = RelayDiscoveryService.getInstance();
  }

  public static getInstance(): LoadMore {
    if (!LoadMore.instance) {
      LoadMore.instance = new LoadMore();
    }
    return LoadMore.instance;
  }

  /**
   * Load more events for infinite scroll with diversity control
   */
  public async loadMoreEvents(request: LoadMoreRequest): Promise<LoadMoreResult> {
    const { userPubkey, followingPubkeys, oldestEventTimestamp, includeReplies } = request;

    console.log(`📜 LOAD MORE: Loading older events before ${new Date(oldestEventTimestamp * 1000).toISOString()}`);

    const allEvents: Map<string, NostrEvent> = new Map();
    let totalFetched = 0;
    let relaysUsed = 0;

    // Strategy: Use only standard relays (no outbound) for testing
    const allRelays = await this.relayDiscovery.getCombinedRelays(followingPubkeys, false);

    if (allRelays.length > 0) {
      const result = await this.eventFetch.fetchEvents({
        timeWindowHours: 1, // Fetch next 1-hour window going backwards
        relays: allRelays,
        authors: followingPubkeys,
        until: oldestEventTimestamp - 1 // Start 1 second before oldest to avoid overlap
      });

      result.events.forEach(event => {
        if (!allEvents.has(event.id)) {
          allEvents.set(event.id, event);
        }
      });

      totalFetched += result.events.length;
      relaysUsed += allRelays.length;
      console.log(`📡 LOAD MORE COMBINED: ${result.events.length} events from ${allRelays.length} relays (standard + outbound)`);
    }

    // Sort and filter
    const events = Array.from(allEvents.values());
    events.sort((a, b) => b.created_at - a.created_at);

    const filteredEvents = includeReplies ? events : this.filterReplies(events);

    // Determine if there are more events to load based on raw fetch results
    // Don't base hasMore on filtered events - reply filtering might remove most events
    const hasMore = events.length >= 20; // Stop if we got fewer than 20 raw events

    console.log(`✅ LOAD MORE: ${filteredEvents.length} events (${events.length} total, hasMore: ${hasMore})`);

    return {
      events: filteredEvents,
      hasMore,
      totalFetched,
      relaysUsed
    };
  }

  /**
   * Enhanced reply filtering - checks content AND tags for reply indicators
   */
  private filterReplies(events: NostrEvent[]): NostrEvent[] {
    return events.filter(event => {
      const content = event.content.trim();

      // 1. Content-based detection: starts with @username or npub
      if (content.match(/^@\w+/) || content.startsWith('npub1')) {
        console.log(`🚫 REPLY FILTERED (content): ${event.id.slice(0, 8)} - "${content.slice(0, 50)}..."`);
        return false; // This is a reply
      }

      // 2. Tag-based detection: has 'e' tags (reply to event)
      const eTags = event.tags.filter(tag => tag[0] === 'e');
      if (eTags.length > 0) {
        console.log(`🚫 REPLY FILTERED (e-tags): ${event.id.slice(0, 8)} - ${eTags.length} e-tags`);
        return false; // This is a reply to another event
      }

      // 3. Allow: reposts (kind 6), quotes, and original posts
      console.log(`✅ TIMELINE INCLUDED: ${event.id.slice(0, 8)} - kind ${event.kind}`);
      return true;
    });
  }
}