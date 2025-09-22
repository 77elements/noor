/**
 * User Service
 * Handles user-related operations like following lists and user metadata
 */

import { SimplePool } from 'nostr-tools/pool';
import type { Event as NostrEvent, Filter as NostrFilter } from 'nostr-tools';
import { RelayConfig } from './RelayConfig';

export class UserService {
  private static instance: UserService;
  private relayConfig: RelayConfig;
  private pool: SimplePool;

  private constructor() {
    this.relayConfig = RelayConfig.getInstance();
    this.pool = new SimplePool();
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Get user's following list from kind:3 events
   */
  public async getUserFollowing(pubkey: string): Promise<string[]> {
    const relays = this.relayConfig.getReadRelays();
    const filter: NostrFilter = {
      authors: [pubkey],
      kinds: [3], // Follow list
      limit: 1
    };

    console.log(`👥 USER SERVICE: Fetching follow list for ${pubkey.slice(0, 8)}...`);

    try {
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

      console.log(`👥 USER SERVICE: Following ${followingPubkeys.length} users`);
      return followingPubkeys;
    } catch (error) {
      console.error('❌ Error fetching follow list:', error);
      return this.relayConfig.getFallbackFollowing();
    }
  }

  /**
   * Subscribe to user metadata updates
   */
  public subscribe(
    subscriptionId: string,
    filter: NostrFilter,
    callback: (event: NostrEvent) => void
  ): () => void {
    const relays = this.relayConfig.getReadRelays();
    const sub = this.pool.sub(relays, [filter]);

    sub.on('event', callback);
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
}