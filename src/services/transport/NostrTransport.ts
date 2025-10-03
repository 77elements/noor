/**
 * NostrTransport - SimplePool Wrapper
 * Central transport layer for all Nostr relay communication
 *
 * Purpose: Abstracts SimplePool to provide unified relay access for Orchestrators
 * Used by: OrchestrationsRouter exclusively (no direct Component access)
 */

import { SimplePool } from 'nostr-tools/pool';
import type { Event as NostrEvent, Filter as NostrFilter, Sub } from 'nostr-tools';
import { RelayConfig } from '../RelayConfig';
import { DebugLogger } from '../../components/debug/DebugLogger';

export interface SubscriptionCallbacks {
  onEvent: (event: NostrEvent) => void;
  onEose?: () => void;
}

export class NostrTransport {
  private static instance: NostrTransport;
  private pool: SimplePool;
  private relayConfig: RelayConfig;
  private debugLogger: DebugLogger;

  private constructor() {
    this.pool = new SimplePool();
    this.relayConfig = RelayConfig.getInstance();
    this.debugLogger = DebugLogger.getInstance();
    this.debugLogger.info('NostrTransport', 'Initialized with SimplePool');
  }

  public static getInstance(): NostrTransport {
    if (!NostrTransport.instance) {
      NostrTransport.instance = new NostrTransport();
    }
    return NostrTransport.instance;
  }

  /**
   * Subscribe to events from relays
   * @returns Sub instance for unsubscribing
   */
  public subscribe(
    relays: string[],
    filters: NostrFilter[],
    callbacks: SubscriptionCallbacks
  ): Sub {
    this.debugLogger.info(
      'NostrTransport',
      `Creating subscription on ${relays.length} relays with ${filters.length} filter(s)`
    );

    const sub = this.pool.sub(relays, filters);

    // Register callbacks
    sub.on('event', (event: NostrEvent) => {
      callbacks.onEvent(event);
    });

    if (callbacks.onEose) {
      sub.on('eose', () => {
        callbacks.onEose!();
      });
    }

    return sub;
  }

  /**
   * Fetch events from relays (one-time query)
   */
  public async fetch(
    relays: string[],
    filters: NostrFilter[],
    timeout: number = 5000
  ): Promise<NostrEvent[]> {
    this.debugLogger.info(
      'NostrTransport',
      `Fetching events from ${relays.length} relays with ${filters.length} filter(s)`
    );

    try {
      const events = await Promise.race([
        this.pool.list(relays, filters),
        new Promise<NostrEvent[]>((_, reject) =>
          setTimeout(() => reject(new Error('Fetch timeout')), timeout)
        )
      ]);

      this.debugLogger.info('NostrTransport', `Fetched ${events.length} events`);
      return events;
    } catch (error) {
      this.debugLogger.error('NostrTransport', `Fetch error: ${error}`);
      return [];
    }
  }

  /**
   * Publish an event to relays
   */
  public async publish(relays: string[], event: NostrEvent): Promise<void> {
    this.debugLogger.info(
      'NostrTransport',
      `Publishing event ${event.id} to ${relays.length} relays`
    );

    try {
      await Promise.all(this.pool.publish(relays, event));
      this.debugLogger.info('NostrTransport', `Event ${event.id} published successfully`);
    } catch (error) {
      this.debugLogger.error('NostrTransport', `Publish error: ${error}`);
      throw error;
    }
  }

  /**
   * Close connections to specific relays
   */
  public close(relays: string[]): void {
    this.debugLogger.info('NostrTransport', `Closing connections to ${relays.length} relays`);
    this.pool.close(relays);
  }

  /**
   * Get read relays from config
   */
  public getReadRelays(): string[] {
    return this.relayConfig.getReadRelays();
  }

  /**
   * Get write relays from config
   */
  public getWriteRelays(): string[] {
    return this.relayConfig.getWriteRelays();
  }

  /**
   * Get the underlying SimplePool instance (for migration compatibility)
   */
  public getPool(): SimplePool {
    return this.pool;
  }
}
