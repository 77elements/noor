/**
 * Quote Note Fetcher
 * Simple service to fetch quoted events from nostr references
 * Handles: nostr:event, nostr:note, nostr:nevent
 * Uses two-stage fetch: standard relays → outbound relays fallback
 */

import type { Event as NostrEvent, Filter as NostrFilter } from 'nostr-tools';
import { nip19 } from 'nostr-tools';
import { SimplePool } from 'nostr-tools/pool';
import { RelayConfig } from './RelayConfig';
import { RelayDiscoveryService } from './RelayDiscoveryService';

export type QuoteFetchError =
  | { type: 'not_found'; message: string; eventId: string }
  | { type: 'network'; message: string; canRetry: true }
  | { type: 'parse'; message: string; reference: string }
  | { type: 'unknown'; message: string };

export type QuoteFetchResult =
  | { success: true; event: NostrEvent }
  | { success: false; error: QuoteFetchError };

export class QuoteNoteFetcher {
  private static instance: QuoteNoteFetcher;
  private pool: SimplePool;
  private relayConfig: RelayConfig;
  private relayDiscovery: RelayDiscoveryService;
  private cache: Map<string, NostrEvent> = new Map();

  private constructor() {
    this.pool = new SimplePool();
    this.relayConfig = RelayConfig.getInstance();
    this.relayDiscovery = RelayDiscoveryService.getInstance();
  }

  public static getInstance(): QuoteNoteFetcher {
    if (!QuoteNoteFetcher.instance) {
      QuoteNoteFetcher.instance = new QuoteNoteFetcher();
    }
    return QuoteNoteFetcher.instance;
  }

  /**
   * Fetch event from nostr reference with detailed error information
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
   * Fetch event with detailed error result
   */
  public async fetchQuotedEventWithError(nostrRef: string): Promise<QuoteFetchResult> {
    try {
      // Check cache first
      if (this.cache.has(nostrRef)) {
        return { success: true, event: this.cache.get(nostrRef)! };
      }

      // Extract event ID
      const eventId = this.extractEventId(nostrRef);
      if (!eventId) {
        return {
          success: false,
          error: {
            type: 'parse',
            message: 'Invalid note reference format',
            reference: nostrRef
          }
        };
      }

      // Fetch event
      const event = await this.fetchEventById(eventId);

      if (event) {
        this.cache.set(nostrRef, event);
        return { success: true, event };
      }

      // Not found after both stages
      return {
        success: false,
        error: {
          type: 'not_found',
          message: 'Note not found on any relays',
          eventId: eventId.slice(0, 12)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'network',
          message: 'Failed to connect to relays',
          canRetry: true
        }
      };
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
   * Fetch event by ID from relays with two-stage strategy
   * Stage 1: Try standard relays
   * Stage 2: If not found, try standard + outbound relays
   */
  private async fetchEventById(eventId: string): Promise<NostrEvent | null> {
    const filter: NostrFilter = {
      ids: [eventId],
      limit: 1
    };

    // Stage 1: Try standard relays first
    console.log(`📡 Stage 1: Fetching from standard relays...`);
    const standardRelays = this.relayConfig.getReadRelays();

    try {
      const events = await this.pool.list(standardRelays, [filter]);
      if (events.length > 0) {
        console.log(`✅ Found on standard relays!`);
        return events[0];
      }
    } catch (error) {
      console.error('⚠️ Stage 1 failed:', error);
    }

    // Stage 2: Not found on standard relays, try with outbound relays
    console.log(`📡 Stage 2: Fetching from standard + outbound relays...`);

    try {
      // Get author pubkey from nevent if available (for outbound relay discovery)
      // For now, use empty array - could be enhanced to extract author from nevent
      const outboundRelays = await this.relayDiscovery.getCombinedRelays([], true);

      const events = await this.pool.list(outboundRelays, [filter]);
      if (events.length > 0) {
        console.log(`✅ Found on outbound relays!`);
        return events[0];
      }
    } catch (error) {
      console.error('⚠️ Stage 2 failed:', error);
    }

    console.log(`❌ Event ${eventId.slice(0, 8)} not found on any relays`);
    return null;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🧹 Quote note cache cleared');
  }
}