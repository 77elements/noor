/**
 * OrchestrationsRouter - Central Event Hub
 * Manages all Orchestrators and distributes Nostr events
 *
 * Architecture:
 * - One subscription per event type (not per component!)
 * - Fan-out: Single event → Multiple interested Orchestrators
 * - All relay communication goes through NostrTransport
 *
 * Usage:
 * 1. Orchestrators register with Router
 * 2. Router creates subscriptions via Transport
 * 3. Events distributed to interested Orchestrators
 * 4. Orchestrators notify their Components
 *
 * @orchestrator OrchestrationsRouter
 * @purpose Central hub for all Nostr events
 * @used-by All Orchestrators (Feed, Reactions, Thread, Profile, etc.)
 */

import type { Event as NostrEvent, Filter as NostrFilter, Sub } from 'nostr-tools';
import { NostrTransport } from '../transport/NostrTransport';
import { Orchestrator } from './Orchestrator';
import { DebugLogger } from '../../components/debug/DebugLogger';

interface Subscription {
  sub: Sub;
  filters: NostrFilter[];
  orchestrators: Set<string>; // Orchestrator names interested in this subscription
}

export class OrchestrationsRouter {
  private static instance: OrchestrationsRouter;
  private transport: NostrTransport;
  private debugLogger: DebugLogger;

  /** Registered orchestrators by name */
  private orchestrators: Map<string, Orchestrator> = new Map();

  /** Active subscriptions */
  private subscriptions: Map<string, Subscription> = new Map();

  private constructor() {
    this.transport = NostrTransport.getInstance();
    this.debugLogger = DebugLogger.getInstance();
    this.debugLogger.info('OrchestrationsRouter', 'Initialized');
  }

  public static getInstance(): OrchestrationsRouter {
    if (!OrchestrationsRouter.instance) {
      OrchestrationsRouter.instance = new OrchestrationsRouter();
    }
    return OrchestrationsRouter.instance;
  }

  /**
   * Register an Orchestrator with the Router
   */
  public registerOrchestrator(orchestrator: Orchestrator): void {
    if (this.orchestrators.has(orchestrator.name)) {
      this.debugLogger.warn(
        'OrchestrationsRouter',
        `Orchestrator '${orchestrator.name}' already registered`
      );
      return;
    }

    orchestrator.setRouter(this);
    this.orchestrators.set(orchestrator.name, orchestrator);
    this.debugLogger.info(
      'OrchestrationsRouter',
      `Registered orchestrator: ${orchestrator.name}`
    );
  }

  /**
   * Unregister an Orchestrator
   */
  public unregisterOrchestrator(name: string): void {
    const orchestrator = this.orchestrators.get(name);
    if (orchestrator) {
      orchestrator.destroy();
      this.orchestrators.delete(name);
      this.debugLogger.info('OrchestrationsRouter', `Unregistered orchestrator: ${name}`);
    }
  }

  /**
   * Create subscription for an Orchestrator
   * @param filters - Nostr filters for subscription
   * @param orchestratorName - Name of orchestrator requesting subscription
   * @param relays - Optional relay list (defaults to read relays)
   * @returns Subscription ID for cleanup
   */
  public subscribe(
    filters: NostrFilter[],
    orchestratorName: string,
    relays?: string[]
  ): string {
    const relayList = relays || this.transport.getReadRelays();
    const subscriptionId = this.generateSubscriptionId(filters, relayList);

    this.debugLogger.info(
      'OrchestrationsRouter',
      `Subscription '${subscriptionId}' requested by ${orchestratorName}`
    );

    // Check if subscription already exists
    let subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      // Add orchestrator to existing subscription
      subscription.orchestrators.add(orchestratorName);
      this.debugLogger.info(
        'OrchestrationsRouter',
        `Reusing subscription '${subscriptionId}' (now ${subscription.orchestrators.size} subscribers)`
      );
    } else {
      // Create new subscription
      const sub = this.transport.subscribe(relayList, filters, {
        onEvent: (event: NostrEvent) => this.distributeEvent(event, subscriptionId),
        onEose: () => this.handleEose(subscriptionId)
      });

      subscription = {
        sub,
        filters,
        orchestrators: new Set([orchestratorName])
      };

      this.subscriptions.set(subscriptionId, subscription);
      this.debugLogger.info(
        'OrchestrationsRouter',
        `Created subscription '${subscriptionId}' on ${relayList.length} relays`
      );
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from a subscription
   */
  public unsubscribe(subscriptionId: string, orchestratorName: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    subscription.orchestrators.delete(orchestratorName);

    // If no orchestrators left, close subscription
    if (subscription.orchestrators.size === 0) {
      subscription.sub.unsub();
      this.subscriptions.delete(subscriptionId);
      this.debugLogger.info(
        'OrchestrationsRouter',
        `Closed subscription '${subscriptionId}' (no subscribers left)`
      );
    } else {
      this.debugLogger.info(
        'OrchestrationsRouter',
        `Subscription '${subscriptionId}' still has ${subscription.orchestrators.size} subscriber(s)`
      );
    }
  }

  /**
   * Distribute event to all interested Orchestrators
   */
  private distributeEvent(event: NostrEvent, subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Fan-out: Send to all orchestrators subscribed to this filter
    subscription.orchestrators.forEach(orchestratorName => {
      const orchestrator = this.orchestrators.get(orchestratorName);
      if (orchestrator) {
        orchestrator.onmessage('relay', event); // TODO: Track actual relay URL
      }
    });
  }

  /**
   * Handle EOSE (End Of Stored Events)
   */
  private handleEose(subscriptionId: string): void {
    this.debugLogger.info('OrchestrationsRouter', `EOSE for subscription '${subscriptionId}'`);
  }

  /**
   * Generate unique subscription ID from filters and relays
   */
  private generateSubscriptionId(filters: NostrFilter[], relays: string[]): string {
    const filterStr = JSON.stringify(filters);
    const relayStr = relays.join(',');
    return `sub_${this.simpleHash(filterStr + relayStr)}`;
  }

  /**
   * Simple hash function for subscription IDs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get subscription count (for debugging)
   */
  public getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get orchestrator count (for debugging)
   */
  public getOrchestratorCount(): number {
    return this.orchestrators.size;
  }

  /**
   * Cleanup all subscriptions and orchestrators
   */
  public destroy(): void {
    this.subscriptions.forEach(sub => sub.sub.unsub());
    this.subscriptions.clear();
    this.orchestrators.forEach(orch => orch.destroy());
    this.orchestrators.clear();
    this.debugLogger.info('OrchestrationsRouter', 'Destroyed');
  }
}
