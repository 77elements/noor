/**
 * ThreadOrchestrator - Thread/Reply Management
 * Handles reply fetching for notes
 *
 * @orchestrator ThreadOrchestrator
 * @purpose Fetch and cache replies for notes (SNV)
 * @used-by SingleNoteView
 *
 * Architecture:
 * - Fetches replies (kind:1 with #e tag pointing to note)
 * - Filters out non-replies (mentions)
 * - Cache: 5min TTL
 * - Silent logging
 */

import type { Event as NostrEvent, Filter as NostrFilter } from 'nostr-tools';
import { Orchestrator } from './Orchestrator';
import { NostrTransport } from '../transport/NostrTransport';
import { DebugLogger } from '../../components/debug/DebugLogger';

export class ThreadOrchestrator extends Orchestrator {
  private static instance: ThreadOrchestrator;
  private transport: NostrTransport;
  private debugLogger: DebugLogger;

  /** Replies cache (5min TTL) */
  private repliesCache: Map<string, { replies: NostrEvent[]; lastUpdated: number }> = new Map();
  private fetchingReplies: Map<string, Promise<NostrEvent[]>> = new Map();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    super('ThreadOrchestrator');
    this.transport = NostrTransport.getInstance();
    this.debugLogger = DebugLogger.getInstance();
    this.debugLogger.info('ThreadOrchestrator', 'Initialized');
  }

  public static getInstance(): ThreadOrchestrator {
    if (!ThreadOrchestrator.instance) {
      ThreadOrchestrator.instance = new ThreadOrchestrator();
    }
    return ThreadOrchestrator.instance;
  }

  /**
   * Fetch replies for a note (with caching)
   */
  public async fetchReplies(noteId: string): Promise<NostrEvent[]> {
    // Check cache first
    const cached = this.repliesCache.get(noteId);
    if (cached && Date.now() - cached.lastUpdated < this.cacheDuration) {
      return cached.replies;
    }

    // If already fetching, wait for that request
    if (this.fetchingReplies.has(noteId)) {
      return await this.fetchingReplies.get(noteId)!;
    }

    // Start new fetch
    const fetchPromise = this.fetchRepliesFromRelays(noteId);
    this.fetchingReplies.set(noteId, fetchPromise);

    try {
      const replies = await fetchPromise;
      this.repliesCache.set(noteId, {
        replies,
        lastUpdated: Date.now()
      });
      return replies;
    } finally {
      this.fetchingReplies.delete(noteId);
    }
  }

  /**
   * Fetch replies from relays
   */
  private async fetchRepliesFromRelays(noteId: string): Promise<NostrEvent[]> {
    const relays = this.transport.getReadRelays();

    const filters: NostrFilter[] = [{
      kinds: [1],
      '#e': [noteId]
    }];

    try {
      const events = await this.transport.fetch(relays, filters, 5000);

      // Filter out non-replies (mentions only)
      const actualReplies = events.filter(event => this.isActualReply(event, noteId));

      // Sort by timestamp (oldest first for thread display)
      actualReplies.sort((a, b) => a.created_at - b.created_at);

      return actualReplies;
    } catch (error) {
      this.debugLogger.error('ThreadOrchestrator', `Fetch replies failed: ${error}`);
      return [];
    }
  }

  /**
   * Check if event is an actual reply (not just a mention)
   */
  private isActualReply(event: NostrEvent, noteId: string): boolean {
    const eTags = event.tags.filter(tag => tag[0] === 'e');
    if (eTags.length === 0) return false;

    // Check if our noteId is referenced with 'reply' marker or is last e-tag
    return eTags.some(tag => {
      return tag[1] === noteId && (tag[3] === 'reply' || tag === eTags[eTags.length - 1]);
    });
  }

  /**
   * Clear cached replies for a note
   */
  public clearCache(noteId: string): void {
    this.repliesCache.delete(noteId);
  }

  /**
   * Clear all cached replies
   */
  public clearAllCache(): void {
    this.repliesCache.clear();
  }

  // Orchestrator interface implementations (unused for now, required by base class)

  public onui(data: any): void {
    // Handle UI actions (future: real-time reply subscriptions)
  }

  public onopen(relay: string): void {
    // Silent operation
  }

  public onmessage(relay: string, event: NostrEvent): void {
    // Handle incoming events from subscriptions (future: live reply updates)
  }

  public onerror(relay: string, error: Error): void {
    this.debugLogger.error('ThreadOrchestrator', `Relay error (${relay}): ${error.message}`);
  }

  public onclose(relay: string): void {
    // Silent operation
  }

  public override destroy(): void {
    this.repliesCache.clear();
    this.fetchingReplies.clear();
    super.destroy();
    this.debugLogger.info('ThreadOrchestrator', 'Destroyed');
  }
}
