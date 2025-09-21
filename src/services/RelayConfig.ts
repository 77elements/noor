/**
 * Relay Configuration Service
 * Manages user's relay settings and preferences
 */

export type RelayType = 'read' | 'write' | 'inbox';

export interface RelayInfo {
  url: string;
  name?: string;
  types: RelayType[];
  isPaid: boolean;
  requiresAuth: boolean;
  isActive: boolean;
  lastConnected?: Date;
  errorCount?: number;
}

export class RelayConfig {
  private static instance: RelayConfig;
  private relays: Map<string, RelayInfo> = new Map();
  private storageKey = 'noornote_relay_config';

  private constructor() {
    this.loadFromStorage();
    this.initializeDefaultRelays();
  }

  public static getInstance(): RelayConfig {
    if (!RelayConfig.instance) {
      RelayConfig.instance = new RelayConfig();
    }
    return RelayConfig.instance;
  }

  /**
   * Initialize with default relay configuration similar to Jumble setup
   */
  private initializeDefaultRelays(): void {
    const defaultRelays: RelayInfo[] = [
      {
        url: 'wss://relay.nostr.band/',
        name: 'Nostr Band',
        types: ['read', 'write'],
        isPaid: false,
        requiresAuth: false,
        isActive: true
      },
      {
        url: 'wss://noornode.nostr1.com/',
        name: 'Noornode',
        types: ['read', 'write'],
        isPaid: true,
        requiresAuth: true,
        isActive: true
      },
      {
        url: 'wss://relay.azzamo.net/',
        name: 'Azzamo',
        types: ['read', 'write'],
        isPaid: true,
        requiresAuth: true,
        isActive: true
      },
      {
        url: 'wss://relay.damus.io/',
        name: 'Damus',
        types: ['read'],
        isPaid: false,
        requiresAuth: false,
        isActive: true
      },
      {
        url: 'wss://relay.primal.net/',
        name: 'Primal',
        types: ['read'],
        isPaid: false,
        requiresAuth: false,
        isActive: true
      },
      {
        url: 'wss://nostr.wine/',
        name: 'Nostr Wine',
        types: ['read'],
        isPaid: true,
        requiresAuth: true,
        isActive: true
      },
      {
        url: 'wss://nos.lol/',
        name: 'Nos',
        types: ['read'],
        isPaid: false,
        requiresAuth: false,
        isActive: true
      }
    ];

    // Only add default relays if user hasn't configured any yet
    if (this.relays.size === 0) {
      defaultRelays.forEach(relay => {
        this.relays.set(relay.url, relay);
      });
      this.saveToStorage();
    }
  }

  /**
   * Get relays filtered by type
   */
  public getRelaysByType(type: RelayType): RelayInfo[] {
    return Array.from(this.relays.values())
      .filter(relay => relay.isActive && relay.types.includes(type))
      .sort((a, b) => {
        // Prioritize free relays for reliability, then paid relays
        if (a.isPaid === b.isPaid) return 0;
        return a.isPaid ? 1 : -1;
      });
  }

  /**
   * Get read relays for timeline loading
   */
  public getReadRelays(): string[] {
    return this.getRelaysByType('read')
      .map(relay => relay.url);
  }

  /**
   * Get write relays for publishing
   */
  public getWriteRelays(): string[] {
    return this.getRelaysByType('write')
      .map(relay => relay.url);
  }

  /**
   * Get inbox relays for DMs
   */
  public getInboxRelays(): string[] {
    return this.getRelaysByType('inbox')
      .map(relay => relay.url);
  }

  /**
   * Add or update a relay
   */
  public addRelay(relayInfo: Omit<RelayInfo, 'errorCount' | 'lastConnected'>): void {
    const existing = this.relays.get(relayInfo.url);
    const relay: RelayInfo = {
      ...relayInfo,
      errorCount: existing?.errorCount || 0,
      lastConnected: existing?.lastConnected
    };

    this.relays.set(relayInfo.url, relay);
    this.saveToStorage();
  }

  /**
   * Remove a relay
   */
  public removeRelay(url: string): void {
    this.relays.delete(url);
    this.saveToStorage();
  }

  /**
   * Update relay connection status
   */
  public updateRelayStatus(url: string, connected: boolean, error?: boolean): void {
    const relay = this.relays.get(url);
    if (relay) {
      if (connected) {
        relay.lastConnected = new Date();
        relay.errorCount = 0;
      } else if (error) {
        relay.errorCount = (relay.errorCount || 0) + 1;
      }
      this.saveToStorage();
    }
  }

  /**
   * Get all relays for management UI
   */
  public getAllRelays(): RelayInfo[] {
    return Array.from(this.relays.values());
  }

  /**
   * Get fallback relays when user relays fail
   */
  public getFallbackRelays(): string[] {
    return [
      'wss://relay.damus.io',
      'wss://relay.snort.social',
      'wss://nos.lol',
      'wss://relay.nostr.band'
    ];
  }

  /**
   * Load configuration from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.relays = new Map(Object.entries(data.relays || {}));
      }
    } catch (error) {
      console.warn('Failed to load relay config from storage:', error);
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        relays: Object.fromEntries(this.relays),
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save relay config to storage:', error);
    }
  }

  /**
   * Reset to default configuration
   */
  public resetToDefaults(): void {
    this.relays.clear();
    this.initializeDefaultRelays();
  }
}