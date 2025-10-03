/**
 * ProfileOrchestrator - User Profile Management
 * Handles profile fetching (kind:0 metadata)
 *
 * @orchestrator ProfileOrchestrator
 * @purpose Fetch and cache user profiles
 * @used-by UserProfileService
 *
 * Architecture:
 * - Fetches kind:0 metadata events
 * - Cache: 7 days TTL (UserProfileService handles localStorage)
 * - Silent logging
 * - Batch fetching support
 */

import type { Event as NostrEvent, Filter as NostrFilter } from 'nostr-tools';
import { Orchestrator } from './Orchestrator';
import { NostrTransport } from '../transport/NostrTransport';
import { DebugLogger } from '../../components/debug/DebugLogger';

export interface Profile {
  pubkey: string;
  name?: string;
  display_name?: string;
  username?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  verified?: boolean;
  lud06?: string;
  lud16?: string;
  website?: string;
  banner?: string;
  lastUpdated?: number;
}

export class ProfileOrchestrator extends Orchestrator {
  private static instance: ProfileOrchestrator;
  private transport: NostrTransport;
  private debugLogger: DebugLogger;

  /** Profile cache (managed externally by UserProfileService) */
  private fetchingProfiles: Map<string, Promise<Profile | null>> = new Map();

  private constructor() {
    super('ProfileOrchestrator');
    this.transport = NostrTransport.getInstance();
    this.debugLogger = DebugLogger.getInstance();
    this.debugLogger.info('ProfileOrchestrator', 'Initialized');
  }

  public static getInstance(): ProfileOrchestrator {
    if (!ProfileOrchestrator.instance) {
      ProfileOrchestrator.instance = new ProfileOrchestrator();
    }
    return ProfileOrchestrator.instance;
  }

  /**
   * Fetch single profile (no caching - handled by UserProfileService)
   */
  public async fetchProfile(pubkey: string): Promise<Profile | null> {
    // If already fetching, wait for that request
    if (this.fetchingProfiles.has(pubkey)) {
      return await this.fetchingProfiles.get(pubkey)!;
    }

    // Start new fetch
    const fetchPromise = this.fetchProfileFromRelays(pubkey);
    this.fetchingProfiles.set(pubkey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      this.fetchingProfiles.delete(pubkey);
    }
  }

  /**
   * Fetch single profile from relays
   */
  private async fetchProfileFromRelays(pubkey: string): Promise<Profile | null> {
    const relays = this.transport.getReadRelays();

    const filters: NostrFilter[] = [{
      authors: [pubkey],
      kinds: [0],
      limit: 1
    }];

    try {
      const events = await this.transport.fetch(relays, filters, 5000);

      if (events.length === 0) {
        return null;
      }

      // Parse most recent profile metadata
      const event = events[0];
      const metadata = JSON.parse(event.content);

      return {
        pubkey,
        name: metadata.name,
        display_name: metadata.display_name,
        username: metadata.username,
        picture: metadata.picture,
        about: metadata.about,
        nip05: metadata.nip05,
        lud06: metadata.lud06,
        lud16: metadata.lud16,
        website: metadata.website,
        banner: metadata.banner,
        lastUpdated: Date.now()
      };
    } catch (error) {
      this.debugLogger.error('ProfileOrchestrator', `Fetch profile failed for ${pubkey.slice(0, 8)}: ${error}`);
      return null;
    }
  }

  /**
   * Fetch multiple profiles in batch
   */
  public async fetchMultipleProfiles(pubkeys: string[]): Promise<Map<string, Profile>> {
    const relays = this.transport.getReadRelays();
    const profiles = new Map<string, Profile>();

    const filters: NostrFilter[] = [{
      authors: pubkeys,
      kinds: [0]
    }];

    try {
      const events = await this.transport.fetch(relays, filters, 10000);

      // Group events by pubkey, keep most recent
      const latestEvents = new Map<string, NostrEvent>();
      events.forEach(event => {
        const existing = latestEvents.get(event.pubkey);
        if (!existing || event.created_at > existing.created_at) {
          latestEvents.set(event.pubkey, event);
        }
      });

      // Parse profiles
      latestEvents.forEach((event, pubkey) => {
        try {
          const metadata = JSON.parse(event.content);
          profiles.set(pubkey, {
            pubkey,
            name: metadata.name,
            display_name: metadata.display_name,
            username: metadata.username,
            picture: metadata.picture,
            about: metadata.about,
            nip05: metadata.nip05,
            lud06: metadata.lud06,
            lud16: metadata.lud16,
            website: metadata.website,
            banner: metadata.banner,
            lastUpdated: Date.now()
          });
        } catch (error) {
          this.debugLogger.error('ProfileOrchestrator', `Parse error for ${pubkey.slice(0, 8)}: ${error}`);
        }
      });

      return profiles;
    } catch (error) {
      this.debugLogger.error('ProfileOrchestrator', `Batch fetch failed: ${error}`);
      return profiles;
    }
  }

  // Orchestrator interface implementations (unused for now, required by base class)

  public onui(data: any): void {
    // Handle UI actions (future: profile update subscriptions)
  }

  public onopen(relay: string): void {
    // Silent operation
  }

  public onmessage(relay: string, event: NostrEvent): void {
    // Handle incoming events from subscriptions (future: live profile updates)
  }

  public onerror(relay: string, error: Error): void {
    this.debugLogger.error('ProfileOrchestrator', `Relay error (${relay}): ${error.message}`);
  }

  public onclose(relay: string): void {
    // Silent operation
  }

  public override destroy(): void {
    this.fetchingProfiles.clear();
    super.destroy();
    this.debugLogger.info('ProfileOrchestrator', 'Destroyed');
  }
}
