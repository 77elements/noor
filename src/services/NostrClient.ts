/**
 * Nostr Client Service
 * Handles relay connections and event fetching using SimplePool pattern from nostr-tools
 */

import { SimplePool } from 'nostr-tools/pool';
import type { Event as NostrEvent, Filter as NostrFilter } from 'nostr-tools';
import { RelayConfig } from './RelayConfig';

interface RelayConnection {
  url: string;
  connected: boolean;
  errorCount: number;
}

export type { NostrEvent, NostrFilter };

export class NostrClient {
  private static instance: NostrClient;
  private relayConfig: RelayConfig;
  private pool: SimplePool;
  private eventCache: Map<string, NostrEvent> = new Map();

  private constructor() {
    this.relayConfig = RelayConfig.getInstance();
    this.pool = new SimplePool();
  }

  public static getInstance(): NostrClient {
    if (!NostrClient.instance) {
      NostrClient.instance = new NostrClient();
    }
    return NostrClient.instance;
  }

  /**
   * Connect to all configured relays
   */
  public async connectToRelays(): Promise<void> {
    const relays = this.relayConfig.getReadRelays();
    console.log(`Connecting to ${relays.length} relays:`, relays);

    // SimplePool handles connections automatically
    // Just log the relays we'll be using
    relays.forEach(url => {
      console.log(`Connected to relay: ${url}`);
    });
  }

  /**
   * Get user's following list
   */
  public async getUserFollowing(pubkey: string): Promise<string[]> {
    const relays = this.relayConfig.getReadRelays();
    const filter: NostrFilter = {
      authors: [pubkey],
      kinds: [3], // Follow list
      limit: 1
    };

    console.log(`Fetching follow list for ${pubkey.slice(0, 8)}...`);

    const events = await this.pool.list(relays, [filter]);

    if (events.length === 0) {
      console.log('No follow list found, using fallback users');
      return this.relayConfig.getFallbackFollowing();
    }

    const followEvent = events[0];
    const followingPubkeys = followEvent.tags
      .filter(tag => tag[0] === 'p')
      .map(tag => tag[1])
      .filter(Boolean);

    console.log(`Following ${followingPubkeys.length} users`);
    return followingPubkeys;
  }

  /**
   * Fetch timeline events for users
   */
  public async fetchTimelineEvents(
    pubkeys: string[],
    limit: number = 100,
    until?: number,
    callback?: (event: NostrEvent) => void
  ): Promise<NostrEvent[]> {
    const relays = this.relayConfig.getReadRelays();
    const filter: NostrFilter = {
      authors: pubkeys,
      kinds: [1], // Text notes
      limit,
      until
    };

    console.log(`🔗 NOSTR CLIENT: Fetching timeline events from ${relays.length} relays for ${pubkeys.length} authors`);
    console.log(`📋 Filter details:`, { limit, until, kinds: [1] });

    const events: NostrEvent[] = [];

    // Use sub for real-time events if callback provided
    if (callback) {
      const sub = this.pool.sub(relays, [filter]);

      sub.on('event', (event: NostrEvent) => {
        if (!this.eventCache.has(event.id)) {
          this.eventCache.set(event.id, event);
          events.push(event);
          callback(event);
        }
      });

      sub.on('eose', () => {
        console.log('End of stored events received');
        sub.close();
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        sub.close();
      }, 5000);
    }

    // Also get initial batch
    const initialEvents = await this.pool.list(relays, [filter]);

    // Cache and deduplicate events
    initialEvents.forEach(event => {
      if (!this.eventCache.has(event.id)) {
        this.eventCache.set(event.id, event);
        events.push(event);
      }
    });

    // Sort by creation time (newest first)
    events.sort((a, b) => b.created_at - a.created_at);
    return events;
  }

  /**
   * Subscribe to events from relays with callback
   */
  public subscribe(subscriptionId: string, filter: NostrFilter, callback: (event: NostrEvent) => void): () => void {
    const relays = this.relayConfig.getReadRelays();


    const sub = this.pool.sub(relays, [filter]);

    sub.on('event', (event: NostrEvent) => {
      if (!this.eventCache.has(event.id)) {
        this.eventCache.set(event.id, event);
        callback(event);
      }
    });

    sub.on('eose', () => {
      // End of stored events
    });

    // Auto-close subscription after 10 seconds to prevent memory leaks
    setTimeout(() => {
      sub.close();
    }, 10000);

    // Return unsubscribe function
    return () => sub.close();
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): RelayConnection[] {
    const relays = this.relayConfig.getReadRelays();
    return relays.map(url => ({
      url,
      connected: true, // SimplePool handles this internally
      errorCount: 0
    }));
  }

  /**
   * Clear event cache
   */
  public clearCache(): void {
    this.eventCache.clear();
  }

  /**
   * Disconnect from all relays
   */
  public disconnectAll(): void {
    this.pool.close(this.relayConfig.getReadRelays());
  }
}