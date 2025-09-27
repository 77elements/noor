/**
 * Quote Note Fetcher
 * Simple service to fetch quoted events from nostr references
 * Handles: nostr:event, nostr:note, nostr:nevent
 */

import type { Event as NostrEvent, Filter as NostrFilter } from 'nostr-tools';
import { nip19 } from 'nostr-tools';
import { SimplePool } from 'nostr-tools/pool';
import { RelayConfig } from './RelayConfig';

export class QuoteNoteFetcher {
  private static instance: QuoteNoteFetcher;
  private pool: SimplePool;
  private relayConfig: RelayConfig;
  private cache: Map<string, NostrEvent> = new Map();

  private constructor() {
    this.pool = new SimplePool();
    this.relayConfig = RelayConfig.getInstance();
  }

  public static getInstance(): QuoteNoteFetcher {
    if (!QuoteNoteFetcher.instance) {
      QuoteNoteFetcher.instance = new QuoteNoteFetcher();
    }
    return QuoteNoteFetcher.instance;
  }

  /**
   * Fetch event from nostr reference
   */
  public async fetchQuotedEvent(nostrRef: string): Promise<NostrEvent | null> {
    try {
      console.log(`📎 Fetching quoted event: ${nostrRef.slice(0, 30)}...`);

      // Check cache first
      if (this.cache.has(nostrRef)) {
        console.log(`✅ Cache hit for ${nostrRef.slice(0, 20)}...`);
        return this.cache.get(nostrRef)!;
      }

      // Extract event ID from different reference types
      const eventId = this.extractEventId(nostrRef);
      if (!eventId) {
        console.error('❌ Could not extract event ID from:', nostrRef);
        return null;
      }

      // Fetch event from relays
      const event = await this.fetchEventById(eventId);

      if (event) {
        this.cache.set(nostrRef, event);
        console.log(`✅ Fetched and cached quoted event: ${event.id.slice(0, 8)}...`);
      } else {
        console.warn(`⚠️ No event found for: ${nostrRef.slice(0, 20)}...`);
      }

      return event;

    } catch (error) {
      console.error('❌ Error fetching quoted event:', error);
      return null;
    }
  }

  /**
   * Extract event ID from different nostr reference types
   */
  private extractEventId(nostrRef: string): string | null {
    try {
      // Remove nostr: prefix if present
      const cleanRef = nostrRef.replace(/^nostr:/, '');

      // Try bech32 decoding first (note1, nevent1)
      try {
        const decoded = nip19.decode(cleanRef);

        switch (decoded.type) {
          case 'note':
            return decoded.data as string;
          case 'nevent':
            return (decoded.data as any).id;
          default:
            break;
        }
      } catch {
        // Not bech32, continue to hex check
      }

      // Check if it's already a hex event ID (64 chars)
      if (cleanRef.match(/^[a-f0-9]{64}$/)) {
        return cleanRef;
      }

      console.error('❌ Unknown reference format:', nostrRef);
      return null;

    } catch (error) {
      console.error('❌ Error extracting event ID:', error);
      return null;
    }
  }

  /**
   * Fetch event by ID from relays
   */
  private async fetchEventById(eventId: string): Promise<NostrEvent | null> {
    const relays = this.relayConfig.getReadRelays();

    const filter: NostrFilter = {
      ids: [eventId],
      limit: 1
    };

    try {
      const events = await this.pool.list(relays, [filter]);
      return events.length > 0 ? events[0] : null;
    } catch (error) {
      console.error('❌ Error fetching event from relays:', error);
      return null;
    }
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🧹 Quote note cache cleared');
  }
}