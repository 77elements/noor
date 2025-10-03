/**
 * User Service
 * Handles user-related operations like following lists and user metadata
 * Uses NostrTransport for all relay communication
 */

import type { Event as NostrEvent } from 'nostr-tools';
import { NostrTransport } from './transport/NostrTransport';
import { RelayConfig } from './RelayConfig';
import { DebugLogger } from '../components/debug/DebugLogger';

export class UserService {
  private static instance: UserService;
  private transport: NostrTransport;
  private relayConfig: RelayConfig;
  private debugLogger: DebugLogger;

  private constructor() {
    this.transport = NostrTransport.getInstance();
    this.relayConfig = RelayConfig.getInstance();
    this.debugLogger = DebugLogger.getInstance();
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Get user's following list from kind:3 events
   * Uses NostrTransport for fetching
   */
  public async getUserFollowing(pubkey: string): Promise<string[]> {
    const relays = this.transport.getReadRelays();

    // Silent operation - only log errors
    // this.debugLogger.info('UserService', `Fetching follow list for ${pubkey.slice(0, 8)}`);

    try {
      const events = await this.transport.fetch(
        relays,
        [{
          authors: [pubkey],
          kinds: [3], // Follow list
          limit: 1
        }]
      );

      if (events.length === 0) {
        this.debugLogger.warn('UserService', 'No follow list found, using fallback');
        return this.relayConfig.getFallbackFollowing();
      }

      const followEvent = events[0];
      const followingPubkeys = followEvent.tags
        .filter(tag => tag[0] === 'p')
        .map(tag => tag[1])
        .filter(Boolean);

      // this.debugLogger.info('UserService', `Following ${followingPubkeys.length} users`);
      return followingPubkeys;
    } catch (error) {
      this.debugLogger.error('UserService', `Error fetching follow list: ${error}`);
      return this.relayConfig.getFallbackFollowing();
    }
  }

  /**
   * Subscribe to user metadata updates
   * Uses NostrTransport for subscriptions
   */
  public subscribe(
    subscriptionId: string,
    filter: { authors?: string[]; kinds?: number[]; ids?: string[] },
    callback: (event: NostrEvent) => void
  ): () => void {
    const relays = this.transport.getReadRelays();

    // Silent operation
    // this.debugLogger.info('UserService', `Creating subscription: ${subscriptionId}`);

    const filters = [{
      authors: filter.authors,
      kinds: filter.kinds,
      ids: filter.ids
    }];

    const sub = this.transport.subscribe(relays, filters, {
      onEvent: callback
    });

    // Auto-close after 10 seconds
    setTimeout(() => {
      sub.unsub();
      // this.debugLogger.info('UserService', `Subscription ${subscriptionId} auto-closed`);
    }, 10000);

    // Return unsubscribe function
    return () => {
      sub.unsub();
      // this.debugLogger.info('UserService', `Subscription ${subscriptionId} closed`);
    };
  }
}