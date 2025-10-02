/**
 * User Profile Service
 * Resolves user pubkeys to usernames, profile pictures, and metadata
 * Now modular - uses single-purpose helpers
 */

import { UserService } from './UserService';
import type { Event as NostrEvent } from 'nostr-tools';
import { generateFallbackAvatar } from '../helpers/generateFallbackAvatar';
import { generateFallbackUsername } from '../helpers/generateFallbackUsername';
import { cacheGet } from '../helpers/cacheGet';
import { cacheSet } from '../helpers/cacheSet';
import { extractDisplayName } from '../helpers/extractDisplayName';
import { isCacheValid } from '../helpers/isCacheValid';
import { cleanOldCacheEntries } from '../helpers/cleanOldCacheEntries';

export interface UserProfile {
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

export class UserProfileService {
  private static instance: UserProfileService;

  // Separate lightweight caches for granular access
  private usernameCache: Map<string, string> = new Map();
  private pictureCache: Map<string, string> = new Map();
  private profileCache: Map<string, UserProfile> = new Map();

  private userService: UserService;
  private fetchingProfiles: Map<string, Promise<UserProfile>> = new Map();
  private storageKey = 'noornote_profile_cache';
  private profileUpdateCallbacks: Map<string, Set<(profile: UserProfile) => void>> = new Map();

  private constructor() {
    this.userService = UserService.getInstance();
    this.loadFromStorage();

    // Clean old cache entries (older than 24 hours)
    this.cleanOldCache();
  }

  public static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService();
    }
    return UserProfileService.instance;
  }

  /**
   * Get username ONLY (lightweight, fast)
   * Uses separate cache, never blocks
   */
  public getUsername(pubkey: string): string {
    const cached = cacheGet(this.usernameCache, pubkey);
    return cached || generateFallbackUsername(pubkey);
  }

  /**
   * Get profile picture ONLY (lightweight, fast)
   * Uses separate cache, never blocks
   */
  public getProfilePicture(pubkey: string): string {
    const cached = cacheGet(this.pictureCache, pubkey);
    return cached || generateFallbackAvatar(pubkey);
  }

  /**
   * Get full user profile (heavier, fetches from relay if needed)
   */
  public async getUserProfile(pubkey: string): Promise<UserProfile> {
    // Check cache first
    const cached = this.profileCache.get(pubkey);
    if (cached && isCacheValid(cached)) {
      return cached;
    }

    // If already fetching, wait for that request
    if (this.fetchingProfiles.has(pubkey)) {
      return await this.fetchingProfiles.get(pubkey)!;
    }

    // Start new fetch
    const fetchPromise = this.fetchProfileFromRelays(pubkey);
    this.fetchingProfiles.set(pubkey, fetchPromise);

    try {
      const profile = await fetchPromise;
      cacheSet(this.profileCache, pubkey, profile);

      // Update granular caches
      const displayName = extractDisplayName(profile);
      if (displayName) {
        cacheSet(this.usernameCache, pubkey, displayName);
      }

      const picture = profile.picture;
      if (picture) {
        cacheSet(this.pictureCache, pubkey, picture);
      }

      this.notifyProfileUpdate(pubkey, profile);
      this.saveToStorage();
      return profile;
    } catch (error) {
      console.warn(`Failed to fetch profile for ${pubkey}:`, error);
      return cached || this.getDefaultProfile(pubkey);
    } finally {
      this.fetchingProfiles.delete(pubkey);
    }
  }


  /**
   * Check if user is verified (has valid NIP-05)
   */
  public isVerified(profile: UserProfile): boolean {
    return profile.verified === true && !!profile.nip05;
  }

  /**
   * Fetch multiple user profiles efficiently
   */
  public async getUserProfiles(pubkeys: string[]): Promise<Map<string, UserProfile>> {
    const profiles = new Map<string, UserProfile>();
    const uncachedPubkeys: string[] = [];

    // Check cache for each pubkey
    pubkeys.forEach(pubkey => {
      const cached = this.profileCache.get(pubkey);
      if (cached && isCacheValid(cached)) {
        profiles.set(pubkey, cached);
      } else {
        uncachedPubkeys.push(pubkey);
      }
    });

    // Fetch uncached profiles in batch
    if (uncachedPubkeys.length > 0) {
      try {
        const fetchedProfiles = await this.fetchMultipleProfilesFromRelays(uncachedPubkeys);
        fetchedProfiles.forEach((profile, pubkey) => {
          profiles.set(pubkey, profile);
          this.profileCache.set(pubkey, profile);
        });
        this.saveToStorage();
      } catch (error) {
        console.warn('Failed to fetch multiple profiles:', error);

        // Add default profiles for failed fetches
        uncachedPubkeys.forEach(pubkey => {
          if (!profiles.has(pubkey)) {
            profiles.set(pubkey, this.getDefaultProfile(pubkey));
          }
        });
      }
    }

    return profiles;
  }

  /**
   * Fetch single profile from relays
   */
  private async fetchProfileFromRelays(pubkey: string): Promise<UserProfile> {
    return new Promise((resolve) => {
      const profile = this.getDefaultProfile(pubkey);
      let hasResponse = false;

      const subscriptionId = `profile_${pubkey}_${Date.now()}`;

      // Subscribe to profile events
      this.userService.subscribe(subscriptionId, { authors: [pubkey], kinds: [0] }, (event: NostrEvent) => {
        if (event.kind === 0 && event.pubkey === pubkey && !hasResponse) {
          try {
            const metadata = JSON.parse(event.content);
            Object.assign(profile, {
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
            hasResponse = true;
            resolve(profile);
          } catch (error) {
            console.warn('Failed to parse profile metadata:', error);
            resolve(profile);
          }
        }
      });

      // Resolve with default profile after timeout
      setTimeout(() => {
        if (!hasResponse) {
          resolve(profile);
        }
      }, 10000);
    });
  }


  /**
   * Fetch multiple profiles efficiently
   */
  private async fetchMultipleProfilesFromRelays(pubkeys: string[]): Promise<Map<string, UserProfile>> {
    return new Promise((resolve) => {
      const profiles = new Map<string, UserProfile>();
      const foundPubkeys = new Set<string>();

      // Initialize with default profiles
      pubkeys.forEach(pubkey => {
        profiles.set(pubkey, this.getDefaultProfile(pubkey));
      });

      const subscriptionId = `profiles_batch_${Date.now()}`;

      // Subscribe to all profile events
      this.userService.subscribe(subscriptionId, { authors: pubkeys, kinds: [0] }, (event: NostrEvent) => {
        if (event.kind === 0 && pubkeys.includes(event.pubkey)) {
          try {
            const metadata = JSON.parse(event.content);
            const profile = profiles.get(event.pubkey) || this.getDefaultProfile(event.pubkey);

            Object.assign(profile, {
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

            profiles.set(event.pubkey, profile);
            foundPubkeys.add(event.pubkey);
          } catch (error) {
            console.warn('Failed to parse profile metadata:', error);
          }
        }
      });

      // Resolve after timeout
      setTimeout(() => {
        resolve(profiles);
      }, 15000);
    });
  }

  /**
   * Create default profile for a pubkey
   */
  private getDefaultProfile(pubkey: string): UserProfile {
    return {
      pubkey,
      lastUpdated: Date.now()
    };
  }

  /**
   * Get fallback avatar URL for a pubkey
   */
  public getFallbackAvatar(pubkey: string): string {
    return generateFallbackAvatar(pubkey);
  }


  /**
   * Clean old cache entries
   */
  private cleanOldCache(): void {
    cleanOldCacheEntries(this.profileCache, 7 * 24 * 60 * 60 * 1000); // 7 days
    this.saveToStorage();
  }

  /**
   * Load profiles from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.profiles) {
          this.profileCache = new Map(Object.entries(data.profiles));

          // Populate granular caches from loaded profiles
          this.profileCache.forEach((profile, pubkey) => {
            const displayName = extractDisplayName(profile);
            if (displayName) {
              this.usernameCache.set(pubkey, displayName);
            }

            if (profile.picture) {
              this.pictureCache.set(pubkey, profile.picture);
            }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load profile cache:', error);
    }
  }

  /**
   * Save profiles to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        profiles: Object.fromEntries(this.profileCache),
        lastSaved: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save profile cache:', error);
    }
  }

  /**
   * Subscribe to profile updates (like nostr-react useProfile pattern)
   */
  public subscribeToProfile(pubkey: string, callback: (profile: UserProfile) => void): () => void {
    if (!this.profileUpdateCallbacks.has(pubkey)) {
      this.profileUpdateCallbacks.set(pubkey, new Set());
    }

    this.profileUpdateCallbacks.get(pubkey)!.add(callback);

    // Immediately call with current profile if available
    const currentProfile = this.profileCache.get(pubkey);
    if (currentProfile) {
      callback(currentProfile);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.profileUpdateCallbacks.get(pubkey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.profileUpdateCallbacks.delete(pubkey);
        }
      }
    };
  }

  /**
   * Notify all subscribers when profile updates
   */
  private notifyProfileUpdate(pubkey: string, profile: UserProfile): void {
    const callbacks = this.profileUpdateCallbacks.get(pubkey);
    if (callbacks) {
      callbacks.forEach(callback => callback(profile));
    }
  }

  /**
   * Clear all cached profiles
   */
  public clearCache(): void {
    this.profileCache.clear();
    localStorage.removeItem(this.storageKey);
  }
}