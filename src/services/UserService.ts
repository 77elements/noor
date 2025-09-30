/**
 * User Service
 * Handles user-related operations like following lists and user metadata
 * Now uses universal fetch and subscribe helpers
 */

import { SimplePool } from 'nostr-tools/pool';
import type { Event as NostrEvent } from 'nostr-tools';
import { RelayConfig } from './RelayConfig';
import { fetchNostrEvents } from '../helpers/fetchNostrEvents';
import { subscribeNostrEvents } from '../helpers/subscribeNostrEvents';

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
   * Now uses universal fetchNostrEvents helper
   */
  public async getUserFollowing(pubkey: string): Promise<string[]> {
    const relays = this.relayConfig.getReadRelays();

    console.log(`👥 USER SERVICE: Fetching follow list for ${pubkey.slice(0, 8)}...`);

    try {
      const result = await fetchNostrEvents({
        relays,
        authors: [pubkey],
        kinds: [3], // Follow list
        limit: 1,
        pool: this.pool
      });

      if (result.events.length === 0) {
        console.log('No follow list found, using fallback users');
        return this.relayConfig.getFallbackFollowing();
      }

      const followEvent = result.events[0];
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
   * Now uses universal subscribeNostrEvents helper
   */
  public subscribe(
    subscriptionId: string,
    filter: { authors?: string[]; kinds?: number[]; ids?: string[] },
    callback: (event: NostrEvent) => void
  ): () => void {
    const relays = this.relayConfig.getReadRelays();

    return subscribeNostrEvents({
      relays,
      authors: filter.authors,
      kinds: filter.kinds,
      ids: filter.ids,
      onEvent: callback,
      pool: this.pool,
      autoCloseAfterMs: 10000
    });
  }
}