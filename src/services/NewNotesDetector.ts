/**
 * NewNotesDetector Service
 * Polls relays for new notes and notifies UI when updates are available
 */

import { SimplePool, type Event as NostrEvent, type Filter } from 'nostr-tools';
import { RelayConfig } from './RelayConfig';

export interface NewNotesInfo {
  count: number;
  authorPubkeys: string[]; // Unique pubkeys of new note authors (max 4, newest first)
}

export type NewNotesCallback = (info: NewNotesInfo) => void;

export class NewNotesDetector {
  private static instance: NewNotesDetector;
  private pool: SimplePool;
  private relayConfig: RelayConfig;
  private pollingInterval: number = 60000; // 60 seconds (configurable)
  private intervalId: number | null = null;
  private lastCheckedTimestamp: number = 0;
  private callback: NewNotesCallback | null = null;
  private followingPubkeys: string[] = [];
  private includeReplies: boolean = false;
  private lastFoundCount: number = 0; // Track last found count to avoid duplicate logs

  private constructor() {
    this.pool = new SimplePool();
    this.relayConfig = RelayConfig.getInstance();
  }

  public static getInstance(): NewNotesDetector {
    if (!NewNotesDetector.instance) {
      NewNotesDetector.instance = new NewNotesDetector();
    }
    return NewNotesDetector.instance;
  }

  /**
   * Start polling for new notes
   * @param followingPubkeys - List of pubkeys to check for new notes
   * @param lastLoadedTimestamp - Timestamp of the most recent note in timeline
   * @param callback - Function to call when new notes are detected
   * @param includeReplies - Whether to include reply notes
   * @param delayMs - Delay before starting polling (default: 10000ms)
   */
  public startPolling(
    followingPubkeys: string[],
    lastLoadedTimestamp: number,
    callback: NewNotesCallback,
    includeReplies: boolean = false,
    delayMs: number = 10000
  ): void {
    // Stop any existing polling
    this.stopPolling();

    this.followingPubkeys = followingPubkeys;
    this.lastCheckedTimestamp = lastLoadedTimestamp;
    this.callback = callback;
    this.includeReplies = includeReplies;

    console.log(`🔔 NEW NOTES DETECTOR: Starting polling in ${delayMs / 1000}s (includeReplies: ${includeReplies})...`);

    // Start polling after delay
    setTimeout(() => {
      this.poll(); // First poll immediately after delay
      this.intervalId = window.setInterval(() => this.poll(), this.pollingInterval);
    }, delayMs);
  }

  /**
   * Stop polling for new notes
   */
  public stopPolling(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🔔 NEW NOTES DETECTOR: Polling stopped');
    }
  }

  /**
   * Set polling interval (in milliseconds)
   */
  public setPollingInterval(intervalMs: number): void {
    this.pollingInterval = intervalMs;
    console.log(`🔔 NEW NOTES DETECTOR: Polling interval set to ${intervalMs / 1000}s`);
  }

  /**
   * Reset last checked timestamp (call this when timeline is refreshed)
   */
  public resetTimestamp(newTimestamp: number): void {
    this.lastCheckedTimestamp = newTimestamp;
    this.lastFoundCount = 0; // Reset count so next new notes will be logged
    console.log(`🔔 NEW NOTES DETECTOR: Timestamp reset to ${new Date(newTimestamp * 1000).toISOString()}`);
  }

  /**
   * Poll relays for new notes
   */
  private async poll(): Promise<void> {
    if (!this.callback || this.followingPubkeys.length === 0) {
      return;
    }

    try {
      const readRelays = this.relayConfig.getReadRelays();
      if (readRelays.length === 0) {
        console.warn('🔔 NEW NOTES DETECTOR: No read relays configured');
        return;
      }

      const now = Math.floor(Date.now() / 1000);

      // Query for new notes since last check
      const filter: Filter = {
        kinds: [1, 6], // Text notes + reposts
        authors: this.followingPubkeys,
        since: this.lastCheckedTimestamp + 1, // Everything after last check
        until: now,
        limit: 100 // Check up to 100 new notes
      };

      const events = await this.pool.list(readRelays, [filter]);

      // Filter replies if needed
      const filteredEvents = this.includeReplies ? events : this.filterReplies(events);

      if (filteredEvents.length > 0) {
        // Only log when count changes (new notes appeared)
        if (filteredEvents.length !== this.lastFoundCount) {
          console.log(`🔔 POLLING: Found ${filteredEvents.length} new notes since ${new Date(this.lastCheckedTimestamp * 1000).toISOString()} (${events.length} total, ${events.length - filteredEvents.length} replies filtered)`);
          this.lastFoundCount = filteredEvents.length;
        }

        // Extract unique author pubkeys (newest first, max 4)
        const uniqueAuthors: string[] = [];
        const seen = new Set<string>();

        // Sort by timestamp (newest first)
        filteredEvents.sort((a, b) => b.created_at - a.created_at);

        for (const event of filteredEvents) {
          if (!seen.has(event.pubkey)) {
            uniqueAuthors.push(event.pubkey);
            seen.add(event.pubkey);
            if (uniqueAuthors.length >= 4) break; // Max 4 authors
          }
        }

        const info: NewNotesInfo = {
          count: filteredEvents.length,
          authorPubkeys: uniqueAuthors
        };

        // Notify callback
        this.callback(info);
      } else {
        // Reset count when no notes found
        this.lastFoundCount = 0;
      }

    } catch (error) {
      console.error('🔔 NEW NOTES DETECTOR ERROR:', error);
    }
  }

  /**
   * Filter out reply notes (same logic as TimelineLoader)
   */
  private filterReplies(events: NostrEvent[]): NostrEvent[] {
    return events.filter(event => {
      // 1. Always allow reposts (kind 6) - they have 'e' tags but aren't replies
      if (event.kind === 6) {
        return true;
      }

      const content = event.content.trim();

      // 2. Content-based detection: starts with @username or npub
      if (content.match(/^@\w+/) || content.startsWith('npub1')) {
        return false; // This is a reply
      }

      // 3. Tag-based detection: has 'e' tags (reply to event)
      const eTags = event.tags.filter(tag => tag[0] === 'e');
      if (eTags.length > 0) {
        return false; // This is a reply to another event
      }

      // 4. Allow: quotes and original posts
      return true;
    });
  }

  /**
   * Manual check for new notes (useful for testing)
   */
  public async checkNow(): Promise<NewNotesInfo | null> {
    return new Promise((resolve) => {
      const originalCallback = this.callback;

      this.callback = (info) => {
        this.callback = originalCallback; // Restore original callback
        resolve(info);
      };

      this.poll();
    });
  }
}
