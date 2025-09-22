/**
 * Relay Discovery Service
 * Implements NIP-65 Relay List Metadata for discovering user's preferred relays
 * Supports "outbound relays" concept for improved timeline diversity
 */

import { SimplePool } from 'nostr-tools/pool';
import type { Event as NostrEvent, Filter as NostrFilter } from 'nostr-tools';
import { RelayConfig } from './RelayConfig';

export interface UserRelayList {
  pubkey: string;
  writeRelays: string[];
  readRelays: string[];
  lastUpdated: number;
}

export interface RelayDiscoveryStats {
  totalUsers: number;
  discoveredRelays: number;
  cacheHits: number;
  cacheMisses: number;
}

export class RelayDiscoveryService {
  private static instance: RelayDiscoveryService;
  private relayConfig: RelayConfig;
  private pool: SimplePool;
  private relayListCache: Map<string, UserRelayList> = new Map();
  private stats: RelayDiscoveryStats = {
    totalUsers: 0,
    discoveredRelays: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  // Cache TTL: 1 hour (relay lists don't change frequently)
  private readonly CACHE_TTL = 60 * 60 * 1000;

  private constructor() {
    this.relayConfig = RelayConfig.getInstance();
    this.pool = new SimplePool();
  }

  public static getInstance(): RelayDiscoveryService {
    if (!RelayDiscoveryService.instance) {
      RelayDiscoveryService.instance = new RelayDiscoveryService();
    }
    return RelayDiscoveryService.instance;
  }

  /**
   * Fetch NIP-65 relay lists for a batch of users
   * Returns discovered relay information for each user
   */
  public async discoverUserRelays(pubkeys: string[]): Promise<UserRelayList[]> {
    const baseRelays = this.relayConfig.getReadRelays();
    const results: UserRelayList[] = [];
    const uncachedPubkeys: string[] = [];

    console.log(`🔍 RELAY DISCOVERY: Fetching relay lists for ${pubkeys.length} users`);

    // Check cache first
    for (const pubkey of pubkeys) {
      const cached = this.getCachedRelayList(pubkey);
      if (cached) {
        results.push(cached);
        this.stats.cacheHits++;
      } else {
        uncachedPubkeys.push(pubkey);
        this.stats.cacheMisses++;
      }
    }

    if (uncachedPubkeys.length === 0) {
      console.log(`✅ All relay lists found in cache`);
      return results;
    }

    console.log(`📡 Fetching relay lists for ${uncachedPubkeys.length} uncached users`);

    // Fetch NIP-65 events (kind:10002) for uncached users
    const filter: NostrFilter = {
      authors: uncachedPubkeys,
      kinds: [10002], // Relay List Metadata
      limit: uncachedPubkeys.length * 2 // Allow for multiple events per user
    };

    try {
      const events = await this.pool.list(baseRelays, [filter]);
      console.log(`📥 Received ${events.length} relay list events`);

      // Process each event and extract relay information
      const processedPubkeys = new Set<string>();

      for (const event of events) {
        if (processedPubkeys.has(event.pubkey)) {
          continue; // Skip if we already processed a newer event for this user
        }

        const relayList = this.parseRelayListEvent(event);
        if (relayList) {
          results.push(relayList);
          this.cacheRelayList(relayList);
          processedPubkeys.add(event.pubkey);
        }
      }

      // Add empty relay lists for users without NIP-65 events
      for (const pubkey of uncachedPubkeys) {
        if (!processedPubkeys.has(pubkey)) {
          const emptyRelayList: UserRelayList = {
            pubkey,
            writeRelays: [],
            readRelays: [],
            lastUpdated: Date.now()
          };
          results.push(emptyRelayList);
          this.cacheRelayList(emptyRelayList);
        }
      }

      this.stats.totalUsers = pubkeys.length;
      this.stats.discoveredRelays = results.reduce((sum, list) =>
        sum + list.writeRelays.length + list.readRelays.length, 0
      );

    } catch (error) {
      console.error('❌ Error fetching relay lists:', error);
    }

    return results;
  }

  /**
   * Get all discovered write relays from a list of users with quality filtering
   * These are the "outbound relays" where users publish their content
   */
  public getOutboundRelays(userRelayLists: UserRelayList[]): string[] {
    const outboundRelays = new Set<string>();
    const baseRelays = new Set(this.relayConfig.getReadRelays());

    for (const relayList of userRelayLists) {
      // Add write relays (where users publish their content)
      for (const relay of relayList.writeRelays) {
        if (this.isValidRelay(relay) &&
            !baseRelays.has(relay) &&
            this.isQualityRelay(relay)) {
          outboundRelays.add(relay);
        }
      }
    }

    const result = Array.from(outboundRelays);
    console.log(`🚀 OUTBOUND RELAYS: Discovered ${result.length} quality additional relays from ${userRelayLists.length} users`);

    return result;
  }

  /**
   * Parse NIP-65 relay list event and extract relay information
   */
  private parseRelayListEvent(event: NostrEvent): UserRelayList | null {
    try {
      const writeRelays: string[] = [];
      const readRelays: string[] = [];

      for (const tag of event.tags) {
        if (tag[0] === 'r' && tag[1]) {
          const relayUrl = tag[1];
          const marker = tag[2]; // 'read', 'write', or undefined

          if (!marker) {
            // No marker means both read and write
            writeRelays.push(relayUrl);
            readRelays.push(relayUrl);
          } else if (marker === 'write') {
            writeRelays.push(relayUrl);
          } else if (marker === 'read') {
            readRelays.push(relayUrl);
          }
        }
      }

      return {
        pubkey: event.pubkey,
        writeRelays: [...new Set(writeRelays)], // Deduplicate
        readRelays: [...new Set(readRelays)],   // Deduplicate
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('❌ Error parsing relay list event:', error);
      return null;
    }
  }

  /**
   * Get cached relay list if still valid
   */
  private getCachedRelayList(pubkey: string): UserRelayList | null {
    const cached = this.relayListCache.get(pubkey);
    if (cached && (Date.now() - cached.lastUpdated) < this.CACHE_TTL) {
      return cached;
    }

    if (cached) {
      this.relayListCache.delete(pubkey); // Remove expired cache
    }

    return null;
  }

  /**
   * Cache relay list
   */
  private cacheRelayList(relayList: UserRelayList): void {
    this.relayListCache.set(relayList.pubkey, relayList);
  }

  /**
   * Validate relay URL
   */
  private isValidRelay(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'wss:' || parsed.protocol === 'ws:';
    } catch {
      return false;
    }
  }

  /**
   * Check if relay meets quality standards for outbound discovery
   * Filters out known problematic relays and localhost/test relays
   */
  private isQualityRelay(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      // Filter out localhost and development relays
      if (hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.includes('test') ||
          hostname.includes('dev')) {
        return false;
      }

      // Filter out known problematic relay patterns
      const problematicPatterns = [
        'relay.damus.io',  // Often has old test events
        'relay.snort.social',  // High spam/test content
        'relay.nostr.band',    // Archive relay with old events
        'relay.nostrich.de',   // Test relay with corrupted data
        'localhost',
        'test',
        'dev',
        'staging'
      ];

      for (const pattern of problematicPatterns) {
        if (hostname.includes(pattern)) {
          console.log(`🚫 QUALITY FILTER: Rejected ${url} (pattern: ${pattern})`);
          return false;
        }
      }

      // Allow well-known production relays
      const trustedPatterns = [
        'relay.nostr.info',
        'nos.lol',
        'relay.primal.net',
        'relay.current.fyi',
        'nostr-pub.wellorder.net',
        'relay.nostr.wirednet.jp',
        'noornode.nostr1.com'
      ];

      for (const pattern of trustedPatterns) {
        if (hostname.includes(pattern)) {
          return true;
        }
      }

      // Default: allow if it looks like a proper domain
      return hostname.includes('.') &&
             !hostname.includes('localhost') &&
             hostname.length > 3;

    } catch {
      return false;
    }
  }

  /**
   * Get discovery statistics
   */
  public getStats(): RelayDiscoveryStats {
    return { ...this.stats };
  }

  /**
   * Clear relay list cache
   */
  public clearCache(): void {
    this.relayListCache.clear();
    console.log('🧹 Relay discovery cache cleared');
  }

  /**
   * Get cache status
   */
  public getCacheStatus(): { size: number; ttl: number } {
    return {
      size: this.relayListCache.size,
      ttl: this.CACHE_TTL
    };
  }
}