/**
 * EventBus - Central Pub/Sub Service
 * Enables app-wide event-based communication between components
 *
 * Events:
 * - user:login - Fired when user successfully authenticates
 * - user:logout - Fired when user signs out
 * - view:change - Fired when route/view changes
 * - note:created - Fired when a new note is published
 */

import { DebugLogger } from '../components/debug/DebugLogger';

type EventCallback = (data?: any) => void;

interface EventSubscription {
  id: string;
  callback: EventCallback;
}

export class EventBus {
  private static instance: EventBus;
  private events: Map<string, EventSubscription[]> = new Map();
  private subscriptionCounter = 0;
  private debugLogger: DebugLogger;

  private constructor() {
    this.debugLogger = DebugLogger.getInstance();
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to an event
   * @returns Subscription ID for cleanup
   */
  public on(eventName: string, callback: EventCallback): string {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const subscriptionId = `${eventName}_${this.subscriptionCounter++}`;
    const subscription: EventSubscription = {
      id: subscriptionId,
      callback
    };

    this.events.get(eventName)!.push(subscription);
    this.debugLogger.info('EventBus', `Subscribed to '${eventName}' (ID: ${subscriptionId})`);

    return subscriptionId;
  }

  /**
   * Unsubscribe from an event
   */
  public off(subscriptionId: string): void {
    const eventName = subscriptionId.split('_')[0];
    const subscriptions = this.events.get(eventName);

    if (subscriptions) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        this.debugLogger.info('EventBus', `Unsubscribed from '${eventName}' (ID: ${subscriptionId})`);
      }

      // Clean up empty event arrays
      if (subscriptions.length === 0) {
        this.events.delete(eventName);
      }
    }
  }

  /**
   * Emit an event with optional data
   */
  public emit(eventName: string, data?: any): void {
    const subscriptions = this.events.get(eventName);
    const subscriberCount = subscriptions?.length || 0;

    this.debugLogger.info('EventBus', `Emitting '${eventName}' → ${subscriberCount} subscriber${subscriberCount !== 1 ? 's' : ''}`);

    if (subscriptions) {
      // Create a copy to avoid issues if callbacks modify subscriptions
      [...subscriptions].forEach(sub => {
        try {
          sub.callback(data);
        } catch (error) {
          console.error(`EventBus error in ${eventName} handler:`, error);
          this.debugLogger.error('EventBus', `Error in '${eventName}' handler: ${error}`);
        }
      });
    }
  }

  /**
   * Subscribe once - automatically unsubscribes after first emit
   */
  public once(eventName: string, callback: EventCallback): string {
    const wrappedCallback = (data?: any) => {
      callback(data);
      this.off(subscriptionId);
    };

    const subscriptionId = this.on(eventName, wrappedCallback);
    return subscriptionId;
  }

  /**
   * Clear all subscriptions for debugging/cleanup
   */
  public clear(): void {
    this.events.clear();
  }

  /**
   * Get active subscription count (for debugging)
   */
  public getSubscriptionCount(eventName?: string): number {
    if (eventName) {
      return this.events.get(eventName)?.length || 0;
    }

    let total = 0;
    this.events.forEach(subs => total += subs.length);
    return total;
  }
}
