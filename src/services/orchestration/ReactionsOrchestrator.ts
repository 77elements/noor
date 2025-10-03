/**
 * ReactionsOrchestrator - Interaction Stats Management
 * Handles reactions, reposts, replies, and zaps for notes
 *
 * @orchestrator ReactionsOrchestrator
 * @purpose Fetch and cache interaction stats for notes (ISL)
 * @used-by InteractionStatusLine (SNV live, Timeline cached)
 *
 * Architecture:
 * - Replaces InteractionStatsService
 * - Uses NostrTransport for all subscriptions
 * - Cache: 5min for Timeline, live for SNV
 * - Fetches reactions, reposts, replies, zaps in parallel
 */

import type { Event as NostrEvent, Filter as NostrFilter } from 'nostr-tools';
import { Orchestrator } from './Orchestrator';
import { NostrTransport } from '../transport/NostrTransport';
import { DebugLogger } from '../../components/debug/DebugLogger';

export interface InteractionStats {
  replies: number;
  reposts: number;
  quotedReposts: number;
  likes: number;
  zaps: number;
  lastUpdated: number;
}

export class ReactionsOrchestrator extends Orchestrator {
  private static instance: ReactionsOrchestrator;
  private transport: NostrTransport;
  private debugLogger: DebugLogger;

  /** Stats cache (5min TTL) */
  private statsCache: Map<string, InteractionStats> = new Map();
  private fetchingStats: Map<string, Promise<InteractionStats>> = new Map();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    super('ReactionsOrchestrator');
    this.transport = NostrTransport.getInstance();
    this.debugLogger = DebugLogger.getInstance();
    this.debugLogger.info('ReactionsOrchestrator', 'Initialized');
  }

  public static getInstance(): ReactionsOrchestrator {
    if (!ReactionsOrchestrator.instance) {
      ReactionsOrchestrator.instance = new ReactionsOrchestrator();
    }
    return ReactionsOrchestrator.instance;
  }

  /**
   * Get stats for a note (with caching)
   */
  public async getStats(noteId: string): Promise<InteractionStats> {
    // Check cache first
    const cached = this.statsCache.get(noteId);
    if (cached && Date.now() - cached.lastUpdated < this.cacheDuration) {
      return cached;
    }

    // If already fetching, wait for that request
    if (this.fetchingStats.has(noteId)) {
      return await this.fetchingStats.get(noteId)!;
    }

    // Start new fetch
    const fetchPromise = this.fetchStatsFromRelays(noteId);
    this.fetchingStats.set(noteId, fetchPromise);

    try {
      const stats = await fetchPromise;
      this.statsCache.set(noteId, stats);
      return stats;
    } finally {
      this.fetchingStats.delete(noteId);
    }
  }

  /**
   * Fetch stats from relays (all types in parallel)
   */
  private async fetchStatsFromRelays(noteId: string): Promise<InteractionStats> {
    const stats: InteractionStats = {
      replies: 0,
      reposts: 0,
      quotedReposts: 0,
      likes: 0,
      zaps: 0,
      lastUpdated: Date.now()
    };

    // Fetch all interaction types in parallel
    const [reactions, reposts, replies, zaps] = await Promise.all([
      this.fetchReactions(noteId),
      this.fetchReposts(noteId),
      this.fetchReplies(noteId),
      this.fetchZaps(noteId)
    ]);

    stats.likes = reactions;
    stats.reposts = reposts.regular;
    stats.quotedReposts = reposts.quoted;
    stats.replies = replies;
    stats.zaps = zaps;

    return stats;
  }

  /**
   * Fetch reaction count (kind 7 with content '+' or '❤️')
   */
  private async fetchReactions(noteId: string): Promise<number> {
    return new Promise((resolve) => {
      const uniqueAuthors = new Set<string>();
      const relays = this.transport.getReadRelays();

      const filters: NostrFilter[] = [{
        kinds: [7],
        '#e': [noteId]
      }];

      const sub = this.transport.subscribe(relays, filters, {
        onEvent: (event: NostrEvent) => {
          // Only count one reaction per author (latest one)
          if (event.content === '+' || event.content === '❤️' || event.content === '🤙') {
            uniqueAuthors.add(event.pubkey);
          }
        }
      });

      // Resolve after timeout
      setTimeout(() => {
        sub.unsub();
        resolve(uniqueAuthors.size);
      }, 3000);
    });
  }

  /**
   * Fetch repost counts (regular + quoted)
   */
  private async fetchReposts(noteId: string): Promise<{ regular: number; quoted: number }> {
    return new Promise((resolve) => {
      let regularCount = 0;
      let quotedCount = 0;
      const uniqueAuthors = new Set<string>();
      const relays = this.transport.getReadRelays();

      const filters: NostrFilter[] = [{
        kinds: [6],
        '#e': [noteId]
      }];

      const sub = this.transport.subscribe(relays, filters, {
        onEvent: (event: NostrEvent) => {
          // Only count one repost per author
          if (!uniqueAuthors.has(event.pubkey)) {
            uniqueAuthors.add(event.pubkey);

            // Check if it's a quoted repost (has 'q' tag)
            const hasQuoteTag = event.tags.some(tag => tag[0] === 'q');
            if (hasQuoteTag) {
              quotedCount++;
            } else {
              regularCount++;
            }
          }
        }
      });

      // Resolve after timeout
      setTimeout(() => {
        sub.unsub();
        resolve({ regular: regularCount, quoted: quotedCount });
      }, 3000);
    });
  }

  /**
   * Fetch reply count (kind 1 with 'e' tag referencing this note)
   */
  private async fetchReplies(noteId: string): Promise<number> {
    return new Promise((resolve) => {
      const replyIds = new Set<string>();
      const relays = this.transport.getReadRelays();

      const filters: NostrFilter[] = [{
        kinds: [1],
        '#e': [noteId]
      }];

      const sub = this.transport.subscribe(relays, filters, {
        onEvent: (event: NostrEvent) => {
          // Check if this is actually a reply (not just a mention)
          const eTags = event.tags.filter(tag => tag[0] === 'e');
          const isReply = eTags.some(tag => {
            // Reply if it references our note and has 'reply' marker or is last e-tag
            return tag[1] === noteId && (tag[3] === 'reply' || tag === eTags[eTags.length - 1]);
          });

          if (isReply) {
            replyIds.add(event.id); // Count by event ID, not author
          }
        }
      });

      // Resolve after timeout
      setTimeout(() => {
        sub.unsub();
        resolve(replyIds.size);
      }, 3000);
    });
  }

  /**
   * Fetch zap amount in sats (kind 9735)
   * Parses bolt11 invoices to get actual amounts
   */
  private async fetchZaps(noteId: string): Promise<number> {
    return new Promise((resolve) => {
      let totalSats = 0;
      const relays = this.transport.getReadRelays();

      const filters: NostrFilter[] = [{
        kinds: [9735],
        '#e': [noteId]
      }];

      const sub = this.transport.subscribe(relays, filters, {
        onEvent: (event: NostrEvent) => {
          // Parse bolt11 invoice to get amount
          const bolt11Tag = event.tags.find(tag => tag[0] === 'bolt11');
          if (bolt11Tag && bolt11Tag[1]) {
            const amount = this.parseBolt11Amount(bolt11Tag[1]);
            if (amount > 0) {
              totalSats += amount;
            }
          }
        }
      });

      // Resolve after timeout (longer for zaps - they can be slow)
      setTimeout(() => {
        sub.unsub();
        resolve(totalSats);
      }, 5000); // 5 seconds for zaps
    });
  }

  /**
   * Parse amount from bolt11 invoice
   * Returns amount in sats (millisats / 1000)
   */
  private parseBolt11Amount(invoice: string): number {
    try {
      // Bolt11 format: lnbc[amount][multiplier]...
      // Example: lnbc1500n... = 1500 nano-bitcoin = 150 sats
      // Multipliers: m=milli, u=micro, n=nano, p=pico

      const match = invoice.match(/^ln(bc|tb)(\d+)([munp]?)/i);
      if (!match) return 0;

      const amount = parseInt(match[2]);
      const multiplier = match[3]?.toLowerCase();

      // Convert to millisats
      let millisats = 0;
      switch (multiplier) {
        case 'm': millisats = amount * 100_000_000; break; // milli-bitcoin
        case 'u': millisats = amount * 100_000; break;     // micro-bitcoin
        case 'n': millisats = amount * 100; break;         // nano-bitcoin
        case 'p': millisats = amount * 0.1; break;         // pico-bitcoin
        default: millisats = amount * 100_000_000_000; break; // bitcoin
      }

      // Convert to sats (millisats / 1000)
      return Math.floor(millisats / 1000);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clear cached stats for a note
   */
  public clearCache(noteId: string): void {
    this.statsCache.delete(noteId);
  }

  /**
   * Clear all cached stats
   */
  public clearAllCache(): void {
    this.statsCache.clear();
  }

  // Orchestrator interface implementations (unused for now, required by base class)

  public onui(data: any): void {
    // Handle UI actions (future: real-time subscriptions)
  }

  public onopen(relay: string): void {
    // Silent operation
  }

  public onmessage(relay: string, event: NostrEvent): void {
    // Handle incoming events from subscriptions (future: live updates)
  }

  public onerror(relay: string, error: Error): void {
    this.debugLogger.error('ReactionsOrchestrator', `Relay error (${relay}): ${error.message}`);
  }

  public onclose(relay: string): void {
    // Silent operation
  }

  public override destroy(): void {
    this.statsCache.clear();
    this.fetchingStats.clear();
    super.destroy();
    this.debugLogger.info('ReactionsOrchestrator', 'Destroyed');
  }
}
