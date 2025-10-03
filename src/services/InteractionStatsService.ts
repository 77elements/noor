/**
 * InteractionStatsService
 * Fetches and caches interaction stats for notes: Reactions, Reposts, Replies, Zaps
 */

import { UserService } from './UserService';
import type { Event as NostrEvent } from 'nostr-tools';

export interface InteractionStats {
  replies: number;
  reposts: number;      // Regular reposts (kind 6 without 'q' tag)
  quotedReposts: number; // Quoted reposts (kind 6 with 'q' tag)
  likes: number;         // Reactions (kind 7 with content '+')
  zaps: number;          // Zap receipts (kind 9735)
  lastUpdated: number;
}

export class InteractionStatsService {
  private static instance: InteractionStatsService;
  private statsCache: Map<string, InteractionStats> = new Map();
  private userService: UserService;
  private fetchingStats: Map<string, Promise<InteractionStats>> = new Map();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.userService = UserService.getInstance();
  }

  public static getInstance(): InteractionStatsService {
    if (!InteractionStatsService.instance) {
      InteractionStatsService.instance = new InteractionStatsService();
    }
    return InteractionStatsService.instance;
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
   * Fetch stats from relays
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

    // Fetch all interaction events in parallel
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
      const reactionEvents: NostrEvent[] = [];
      const uniqueAuthors = new Set<string>();

      const subscriptionId = `reactions_${noteId}_${Date.now()}`;

      this.userService.subscribe(
        subscriptionId,
        {
          kinds: [7],
          '#e': [noteId]
        },
        (event: NostrEvent) => {
          // Only count one reaction per author (latest one)
          if (event.content === '+' || event.content === '❤️' || event.content === '🤙') {
            if (!uniqueAuthors.has(event.pubkey)) {
              uniqueAuthors.add(event.pubkey);
              reactionEvents.push(event);
            }
          }
        }
      );

      // Resolve after timeout
      setTimeout(() => {
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

      const subscriptionId = `reposts_${noteId}_${Date.now()}`;

      this.userService.subscribe(
        subscriptionId,
        {
          kinds: [6],
          '#e': [noteId]
        },
        (event: NostrEvent) => {
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
      );

      // Resolve after timeout
      setTimeout(() => {
        resolve({ regular: regularCount, quoted: quotedCount });
      }, 3000);
    });
  }

  /**
   * Fetch reply count (kind 1 with 'e' tag referencing this note)
   */
  private async fetchReplies(noteId: string): Promise<number> {
    return new Promise((resolve) => {
      const replyAuthors = new Set<string>();

      const subscriptionId = `replies_${noteId}_${Date.now()}`;

      this.userService.subscribe(
        subscriptionId,
        {
          kinds: [1],
          '#e': [noteId]
        },
        (event: NostrEvent) => {
          // Check if this is actually a reply (not just a mention)
          const eTags = event.tags.filter(tag => tag[0] === 'e');
          const isReply = eTags.some(tag => {
            // Reply if it references our note and has 'reply' marker or is last e-tag
            return tag[1] === noteId && (tag[3] === 'reply' || tag === eTags[eTags.length - 1]);
          });

          if (isReply) {
            replyAuthors.add(event.id); // Count by event ID, not author (allow multiple replies from same user)
          }
        }
      );

      // Resolve after timeout
      setTimeout(() => {
        resolve(replyAuthors.size);
      }, 3000);
    });
  }

  /**
   * Fetch zap count (kind 9735)
   */
  private async fetchZaps(noteId: string): Promise<number> {
    return new Promise((resolve) => {
      let zapCount = 0;

      const subscriptionId = `zaps_${noteId}_${Date.now()}`;

      this.userService.subscribe(
        subscriptionId,
        {
          kinds: [9735],
          '#e': [noteId]
        },
        (event: NostrEvent) => {
          // TODO: Parse bolt11 tag to get actual sats amount
          zapCount++;
        }
      );

      // Resolve after timeout
      setTimeout(() => {
        resolve(zapCount);
      }, 3000);
    });
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
}
