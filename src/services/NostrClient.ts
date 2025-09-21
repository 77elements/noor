/**
 * Nostr Client Service
 * Handles relay connections and event fetching using SimplePool pattern
 */

import { RelayConfig } from './RelayConfig';

// Simple Nostr types (will be replaced with nostr-tools when available)
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [key: string]: any;
}

export interface RelayConnection {
  url: string;
  connected: boolean;
  errorCount: number;
}

export class NostrClient {
  private static instance: NostrClient;
  private relayConfig: RelayConfig;
  private connections: Map<string, WebSocket> = new Map();
  private eventCache: Map<string, NostrEvent> = new Map();
  private subscriptions: Map<string, { filter: NostrFilter; callback: (event: NostrEvent) => void }> = new Map();
  private rateLimitDelay = 100; // 100ms between requests to be respectful

  private constructor() {
    this.relayConfig = RelayConfig.getInstance();
  }

  public static getInstance(): NostrClient {
    if (!NostrClient.instance) {
      NostrClient.instance = new NostrClient();
    }
    return NostrClient.instance;
  }

  /**
   * Connect to read relays for timeline loading
   */
  public async connectToReadRelays(): Promise<RelayConnection[]> {
    const readRelays = this.relayConfig.getReadRelays();
    const connections: RelayConnection[] = [];

    for (const relayUrl of readRelays) {
      try {
        await this.connectToRelay(relayUrl);
        connections.push({ url: relayUrl, connected: true, errorCount: 0 });
        this.relayConfig.updateRelayStatus(relayUrl, true);
      } catch (error) {
        console.warn(`Failed to connect to relay ${relayUrl}:`, error);
        connections.push({ url: relayUrl, connected: false, errorCount: 1 });
        this.relayConfig.updateRelayStatus(relayUrl, false, true);
      }

      // Rate limiting: small delay between connections
      await this.delay(this.rateLimitDelay);
    }

    return connections;
  }

  /**
   * Connect to a specific relay
   */
  private async connectToRelay(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connections.has(url)) {
        resolve();
        return;
      }

      const ws = new WebSocket(url);

      ws.onopen = () => {
        this.connections.set(url, ws);
        console.log(`Connected to relay: ${url}`);
        resolve();
      };

      ws.onerror = (error) => {
        console.error(`Error connecting to relay ${url}:`, error);
        reject(error);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleRelayMessage(url, message);
        } catch (error) {
          console.warn(`Invalid message from relay ${url}:`, error);
        }
      };

      ws.onclose = () => {
        this.connections.delete(url);
        console.log(`Disconnected from relay: ${url}`);
      };

      // Connection timeout
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          reject(new Error(`Connection timeout to ${url}`));
        }
      }, 5000);
    });
  }

  /**
   * Handle incoming relay messages
   */
  private handleRelayMessage(relayUrl: string, message: any[]): void {
    const [type, subscriptionId, event] = message;

    if (type === 'EVENT' && event) {
      // Cache event to prevent duplicates
      if (!this.eventCache.has(event.id)) {
        this.eventCache.set(event.id, event);

        // Notify subscription callback
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
          subscription.callback(event);
        }
      }
    } else if (type === 'EOSE') {
      console.log(`End of stored events from ${relayUrl} for subscription ${subscriptionId}`);
    } else if (type === 'NOTICE') {
      console.warn(`Notice from ${relayUrl}:`, event);
    }
  }

  /**
   * Fetch follow list for a user
   */
  public async fetchFollowList(pubkey: string): Promise<string[]> {
    const filter: NostrFilter = {
      authors: [pubkey],
      kinds: [3], // Follow list kind
      limit: 1
    };

    return new Promise((resolve) => {
      const followingPubkeys: string[] = [];
      const subscriptionId = `follows_${pubkey}_${Date.now()}`;

      this.subscriptions.set(subscriptionId, {
        filter,
        callback: (event: NostrEvent) => {
          if (event.kind === 3) {
            // Extract pubkeys from p tags
            event.tags.forEach(tag => {
              if (tag[0] === 'p' && tag[1]) {
                followingPubkeys.push(tag[1]);
              }
            });
          }
        }
      });

      // Send subscription to all connected relays
      this.sendSubscriptionToRelays(subscriptionId, filter);

      // Resolve after a timeout (3 seconds should be enough for follow list)
      setTimeout(() => {
        this.closeSubscription(subscriptionId);
        resolve(followingPubkeys);
      }, 3000);
    });
  }

  /**
   * Fetch timeline events for users
   */
  public async fetchTimelineEvents(
    pubkeys: string[],
    limit: number = 100,
    since?: number,
    callback?: (event: NostrEvent) => void
  ): Promise<NostrEvent[]> {
    const filter: NostrFilter = {
      authors: pubkeys,
      kinds: [1], // Text notes
      limit,
      since
    };

    const events: NostrEvent[] = [];
    const subscriptionId = `timeline_${Date.now()}`;

    this.subscriptions.set(subscriptionId, {
      filter,
      callback: (event: NostrEvent) => {
        events.push(event);
        if (callback) {
          callback(event);
        }
      }
    });

    // Send subscription to connected read relays
    this.sendSubscriptionToRelays(subscriptionId, filter);

    // Return events after 5 seconds (enough time for most relays to respond)
    return new Promise((resolve) => {
      setTimeout(() => {
        this.closeSubscription(subscriptionId);
        // Sort events by creation time (newest first)
        events.sort((a, b) => b.created_at - a.created_at);
        resolve(events);
      }, 5000);
    });
  }

  /**
   * Send subscription request to all connected relays
   */
  private sendSubscriptionToRelays(subscriptionId: string, filter: NostrFilter): void {
    const message = JSON.stringify(['REQ', subscriptionId, filter]);

    this.connections.forEach((ws, url) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Close a subscription
   */
  private closeSubscription(subscriptionId: string): void {
    const message = JSON.stringify(['CLOSE', subscriptionId]);

    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });

    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Get cached events (for performance)
   */
  public getCachedEvents(): NostrEvent[] {
    return Array.from(this.eventCache.values())
      .sort((a, b) => b.created_at - a.created_at);
  }

  /**
   * Clear event cache
   */
  public clearCache(): void {
    this.eventCache.clear();
  }

  /**
   * Disconnect from all relays
   */
  public disconnectAll(): void {
    this.connections.forEach((ws) => {
      ws.close();
    });
    this.connections.clear();
    this.subscriptions.clear();
  }

  /**
   * Rate limiting helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): RelayConnection[] {
    const status: RelayConnection[] = [];

    this.connections.forEach((ws, url) => {
      status.push({
        url,
        connected: ws.readyState === WebSocket.OPEN,
        errorCount: 0 // Will be tracked properly later
      });
    });

    return status;
  }
}