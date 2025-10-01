/**
 * Timeline Loader
 * Handles initial timeline loading strategy and decisions
 * Tells EventFetch exactly what to do for timeline initialization
 */

import type { Event as NostrEvent } from 'nostr-tools';
import { EventFetchService } from './EventFetchService';
import { RelayConfig } from './RelayConfig';
import { RelayDiscoveryService } from './RelayDiscoveryService';

export interface TimelineLoadRequest {
  userPubkey: string;
  followingPubkeys: string[];
  includeReplies: boolean;
}

export interface TimelineLoadResult {
  events: NostrEvent[];
  totalFetched: number;
  relaysUsed: number;
  hasMore: boolean;
}

export class TimelineLoader {
  private static instance: TimelineLoader;
  private eventFetch: EventFetchService;
  private relayConfig: RelayConfig;
  private relayDiscovery: RelayDiscoveryService;

  private constructor() {
    this.eventFetch = EventFetchService.getInstance();
    this.relayConfig = RelayConfig.getInstance();
    this.relayDiscovery = RelayDiscoveryService.getInstance();
  }

  public static getInstance(): TimelineLoader {
    if (!TimelineLoader.instance) {
      TimelineLoader.instance = new TimelineLoader();
    }
    return TimelineLoader.instance;
  }

  /**
   * Load initial timeline with strategic relay distribution
   */
  public async loadInitialTimeline(request: TimelineLoadRequest): Promise<TimelineLoadResult> {
    const { userPubkey, followingPubkeys, includeReplies } = request;

    console.log(`📋 TIMELINE LOADER: Loading initial timeline for ${followingPubkeys.length} users`);

    const allEvents: Map<string, NostrEvent> = new Map();
    let totalFetched = 0;
    let relaysUsed = 0;

    // Strategy: Use only standard relays (outbound relays cause too many connections/timeouts)
    const result = await this.eventFetch.fetchEvents({
      timeWindowHours: 1, // Initial load: get events from last 1 hour
      authors: followingPubkeys,
      useOutboundRelays: false
    });

    result.events.forEach(event => {
      if (!allEvents.has(event.id)) {
        allEvents.set(event.id, event);
      }
    });

    totalFetched += result.events.length;
    relaysUsed += result.relayStats.size;

    // Sort and filter
    const events = Array.from(allEvents.values());
    events.sort((a, b) => b.created_at - a.created_at);

    const filteredEvents = includeReplies ? events : this.filterReplies(events);

    console.log(`✅ TIMELINE LOADER: ${filteredEvents.length} events (${events.length} total, ${allEvents.size} unique)`);

    return {
      events: filteredEvents,
      totalFetched,
      relaysUsed,
      hasMore: true // Always true for initial load - LoadMore service will handle pagination
    };
  }

  /**
   * Enhanced reply filtering - checks content AND tags for reply indicators
   */
  private filterReplies(events: NostrEvent[]): NostrEvent[] {
    return events.filter(event => {
      // 1. Always allow reposts (kind 6) - they have 'e' tags but aren't replies
      if (event.kind === 6) {
        return true;
      }

      const content = event.content.trim();

      // 2. Content-based detection: starts with @username or npub
      if (content.match(/^@\w+/) || content.startsWith('npub1')) {
        return false; // This is a reply
      }

      // 3. Tag-based detection: has 'e' tags (reply to event)
      const eTags = event.tags.filter(tag => tag[0] === 'e');
      if (eTags.length > 0) {
        return false; // This is a reply to another event
      }

      // 4. Allow: quotes and original posts
      return true;
    });
  }
}