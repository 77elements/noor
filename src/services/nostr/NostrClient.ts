/**
 * Nostr Client Service
 * High-performance client using SimplePool + DataLoader pattern
 */

import { SimplePool } from 'nostr-tools/pool';
import type { Event, Filter } from 'nostr-tools';
import DataLoader from 'dataloader';

import type {
  NostrClientConfig,
  RelayConfig,
  RelayStatus,
  ExtendedEvent,
  SubscriptionConfig,
} from '@types/nostr';

/**
 * Default relay configuration
 */
const DEFAULT_RELAYS: RelayConfig[] = [
  {
    url: 'wss://noornode.nostr1.com',
    read: true,
    write: true,
    priority: 1,
    maxRetries: 3,
    timeout: 5000,
  },
  {
    url: 'wss://relay.damus.io',
    read: true,
    write: true,
    priority: 2,
    maxRetries: 3,
    timeout: 5000,
  },
  {
    url: 'wss://nos.lol',
    read: true,
    write: true,
    priority: 3,
    maxRetries: 3,
    timeout: 5000,
  },
];

/**
 * Default client configuration
 */
const DEFAULT_CONFIG: NostrClientConfig = {
  defaultRelays: DEFAULT_RELAYS,
  maxConnections: navigator.userAgent.includes('Safari') ? 3 : 8, // Safari WebSocket optimization
  reconnectDelay: 1000,
  eventCacheTTL: 300000, // 5 minutes
  enableBatching: true,
  batchSize: 100,
  batchDelay: 50,
};

/**
 * Main Nostr client class with SimplePool + DataLoader optimization
 */
export class NostrClient {
  private pool: SimplePool;
  private config: NostrClientConfig;
  private relayStatuses: Map<string, RelayStatus> = new Map();
  private subscriptions: Map<string, AbortController> = new Map();

  // DataLoader for batching event requests
  private eventLoader: DataLoader<string, ExtendedEvent | null>;
  private profileLoader: DataLoader<string, ExtendedEvent | null>;

  constructor(config: Partial<NostrClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pool = new SimplePool();

    // Initialize DataLoaders for batching
    this.eventLoader = new DataLoader(this.batchLoadEvents.bind(this), {
      maxBatchSize: this.config.batchSize,
      batchScheduleFn: callback => setTimeout(callback, this.config.batchDelay),
    });

    this.profileLoader = new DataLoader(this.batchLoadProfiles.bind(this), {
      maxBatchSize: this.config.batchSize,
      batchScheduleFn: callback => setTimeout(callback, this.config.batchDelay),
    });

    this.initializeRelayStatuses();
  }

  /**
   * Initialize relay status tracking
   */
  private initializeRelayStatuses(): void {
    for (const relay of this.config.defaultRelays) {
      this.relayStatuses.set(relay.url, {
        url: relay.url,
        connected: false,
        retryCount: 0,
      });
    }
  }

  /**
   * Get active read relays
   */
  private getReadRelays(): string[] {
    return this.config.defaultRelays
      .filter(relay => relay.read)
      .sort((a, b) => a.priority - b.priority)
      .map(relay => relay.url);
  }

  /**
   * Get active write relays
   */
  private getWriteRelays(): string[] {
    return this.config.defaultRelays
      .filter(relay => relay.write)
      .sort((a, b) => a.priority - b.priority)
      .map(relay => relay.url);
  }

  /**
   * Batch load events by IDs
   */
  private async batchLoadEvents(eventIds: readonly string[]): Promise<(ExtendedEvent | null)[]> {
    if (eventIds.length === 0) return [];

    const filters: Filter[] = [
      {
        ids: [...eventIds],
      },
    ];

    const events = await this.pool.querySync(this.getReadRelays(), filters);

    // Create a map for efficient lookup
    const eventMap = new Map<string, ExtendedEvent>();
    for (const event of events) {
      eventMap.set(event.id, this.enhanceEvent(event));
    }

    // Return results in the same order as requested IDs
    return eventIds.map(id => eventMap.get(id) || null);
  }

  /**
   * Batch load user profiles by pubkeys
   */
  private async batchLoadProfiles(pubkeys: readonly string[]): Promise<(ExtendedEvent | null)[]> {
    if (pubkeys.length === 0) return [];

    const filters: Filter[] = [
      {
        kinds: [0], // Profile metadata
        authors: [...pubkeys],
      },
    ];

    const events = await this.pool.querySync(this.getReadRelays(), filters);

    // Get the latest profile for each pubkey
    const profileMap = new Map<string, ExtendedEvent>();
    for (const event of events) {
      const existing = profileMap.get(event.pubkey);
      if (!existing || event.created_at > existing.created_at) {
        profileMap.set(event.pubkey, this.enhanceEvent(event));
      }
    }

    // Return results in the same order as requested pubkeys
    return pubkeys.map(pubkey => profileMap.get(pubkey) || null);
  }

  /**
   * Enhance raw event with additional metadata
   */
  private enhanceEvent(event: Event): ExtendedEvent {
    return {
      ...event,
      seenOn: [],
      firstSeen: Date.now(),
      processed: false,
      cached: false,
      expanded: false,
      reactions: {
        likes: 0,
        reposts: 0,
        replies: 0,
        zaps: 0,
      },
    };
  }

  /**
   * Subscribe to events with filters
   */
  public subscribe(config: SubscriptionConfig): AbortController {
    const abortController = new AbortController();
    this.subscriptions.set(config.id, abortController);

    const relays = config.relays || this.getReadRelays();

    // Use SimplePool subscription
    const subscription = this.pool.subscribeMany(
      relays,
      config.filters,
      {
        onevent: (event: Event) => {
          const enhancedEvent = this.enhanceEvent(event);
          this.handleEvent(enhancedEvent, config.id);
        },
        oneose: () => {
          if (config.closeOnEose) {
            this.unsubscribe(config.id);
          }
          this.handleEose(config.id);
        },
        onclose: (reason: string) => {
          this.handleClose(config.id, reason);
        },
      }
    );

    // Handle abort signal
    abortController.signal.addEventListener('abort', () => {
      subscription.close();
      this.subscriptions.delete(config.id);
    });

    return abortController;
  }

  /**
   * Unsubscribe from a subscription
   */
  public unsubscribe(subscriptionId: string): void {
    const controller = this.subscriptions.get(subscriptionId);
    if (controller) {
      controller.abort();
    }
  }

  /**
   * Get event by ID (with DataLoader batching)
   */
  public async getEvent(eventId: string): Promise<ExtendedEvent | null> {
    return this.eventLoader.load(eventId);
  }

  /**
   * Get user profile by pubkey (with DataLoader batching)
   */
  public async getProfile(pubkey: string): Promise<ExtendedEvent | null> {
    return this.profileLoader.load(pubkey);
  }

  /**
   * Publish event to write relays
   */
  public async publish(event: Event): Promise<void> {
    const writeRelays = this.getWriteRelays();
    await Promise.all(
      writeRelays.map(relay => this.pool.publish([relay], event))
    );
  }

  /**
   * Get relay statuses
   */
  public getRelayStatuses(): RelayStatus[] {
    return Array.from(this.relayStatuses.values());
  }

  /**
   * Event handlers
   */
  private handleEvent(event: ExtendedEvent, subscriptionId: string): void {
    // Dispatch custom event for application to handle
    window.dispatchEvent(
      new CustomEvent('nostr:event', {
        detail: { event, subscriptionId },
      })
    );
  }

  private handleEose(subscriptionId: string): void {
    window.dispatchEvent(
      new CustomEvent('nostr:eose', {
        detail: { subscriptionId },
      })
    );
  }

  private handleClose(subscriptionId: string, reason: string): void {
    window.dispatchEvent(
      new CustomEvent('nostr:close', {
        detail: { subscriptionId, reason },
      })
    );
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Close all subscriptions
    for (const controller of this.subscriptions.values()) {
      controller.abort();
    }
    this.subscriptions.clear();

    // Close pool connections
    this.pool.close(this.getReadRelays());

    // Clear DataLoader caches
    this.eventLoader.clearAll();
    this.profileLoader.clearAll();
  }
}