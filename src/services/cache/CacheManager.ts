/**
 * Cache Manager Service
 * Multi-layer caching with IndexedDB persistence and memory optimization
 */

import type { ExtendedEvent, CacheEntry } from '@types/nostr';

/**
 * Cache statistics for monitoring
 */
interface CacheStats {
  memoryEntries: number;
  indexedDBEntries: number;
  memorySize: number;
  hits: number;
  misses: number;
  evictions: number;
}

/**
 * Cache configuration
 */
interface CacheConfig {
  maxMemoryEntries: number;
  maxMemorySize: number; // bytes
  defaultTTL: number; // milliseconds
  cleanupInterval: number; // milliseconds
  indexedDBName: string;
  indexedDBVersion: number;
}

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  maxMemoryEntries: 1000,
  maxMemorySize: 10 * 1024 * 1024, // 10MB
  defaultTTL: 300000, // 5 minutes
  cleanupInterval: 60000, // 1 minute
  indexedDBName: 'noor-cache',
  indexedDBVersion: 1,
};

/**
 * Multi-layer cache manager with memory + IndexedDB storage
 */
export class CacheManager {
  private config: CacheConfig;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private db: IDBDatabase | null = null;
  private cleanupTimer: number | null = null;
  private stats: CacheStats = {
    memoryEntries: 0,
    indexedDBEntries: 0,
    memorySize: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeIndexedDB();
    this.startCleanup();
  }

  /**
   * Initialize IndexedDB for persistent caching
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.indexedDBName, this.config.indexedDBVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.info('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create events store
        if (!db.objectStoreNames.contains('events')) {
          const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
          eventsStore.createIndex('timestamp', 'timestamp');
          eventsStore.createIndex('pubkey', 'event.pubkey');
          eventsStore.createIndex('kind', 'event.kind');
        }

        // Create profiles store
        if (!db.objectStoreNames.contains('profiles')) {
          const profilesStore = db.createObjectStore('profiles', { keyPath: 'id' });
          profilesStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  /**
   * Get event from cache (memory first, then IndexedDB)
   */
  public async get(key: string): Promise<ExtendedEvent | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      this.stats.hits++;
      return memoryEntry.event;
    }

    // Check IndexedDB
    const dbEntry = await this.getFromIndexedDB(key);
    if (dbEntry && !this.isExpired(dbEntry)) {
      // Promote to memory cache
      this.setInMemory(key, dbEntry);
      this.stats.hits++;
      return dbEntry.event;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set event in cache (both memory and IndexedDB)
   */
  public async set(
    key: string,
    event: ExtendedEvent,
    options: { ttl?: number; source?: string } = {}
  ): Promise<void> {
    const entry: CacheEntry = {
      event,
      timestamp: Date.now(),
      source: options.source || 'unknown',
      ttl: options.ttl || this.config.defaultTTL,
    };

    // Set in memory cache
    this.setInMemory(key, entry);

    // Set in IndexedDB
    await this.setInIndexedDB(key, entry);

    // Mark event as cached
    event.cached = true;
  }

  /**
   * Remove event from cache
   */
  public async delete(key: string): Promise<void> {
    // Remove from memory
    this.memoryCache.delete(key);
    this.updateMemoryStats();

    // Remove from IndexedDB
    await this.deleteFromIndexedDB(key);
  }

  /**
   * Clear all cache entries
   */
  public async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    this.updateMemoryStats();

    // Clear IndexedDB
    await this.clearIndexedDB();

    // Reset stats
    this.stats = {
      memoryEntries: 0,
      indexedDBEntries: 0,
      memorySize: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Set entry in memory cache with size management
   */
  private setInMemory(key: string, entry: CacheEntry): void {
    // Remove existing entry if present
    if (this.memoryCache.has(key)) {
      this.memoryCache.delete(key);
    }

    // Add new entry
    this.memoryCache.set(key, entry);

    // Update stats
    this.updateMemoryStats();

    // Ensure memory limits
    this.enforceMemoryLimits();
  }

  /**
   * Get entry from IndexedDB
   */
  private async getFromIndexedDB(key: string): Promise<CacheEntry | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readonly');
      const store = transaction.objectStore('events');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to get from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Set entry in IndexedDB
   */
  private async setInIndexedDB(key: string, entry: CacheEntry): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      const request = store.put({ id: key, ...entry });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to set in IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete entry from IndexedDB
   */
  private async deleteFromIndexedDB(key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all entries from IndexedDB
   */
  private async clearIndexedDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events', 'profiles'], 'readwrite');

      const eventsStore = transaction.objectStore('events');
      const profilesStore = transaction.objectStore('profiles');

      const eventsRequest = eventsStore.clear();
      const profilesRequest = profilesStore.clear();

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        console.error('Failed to clear IndexedDB:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Update memory cache statistics
   */
  private updateMemoryStats(): void {
    this.stats.memoryEntries = this.memoryCache.size;

    // Estimate memory size (rough calculation)
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += JSON.stringify(entry).length * 2; // Rough byte estimate
    }
    this.stats.memorySize = totalSize;
  }

  /**
   * Enforce memory cache limits (LRU eviction)
   */
  private enforceMemoryLimits(): void {
    // Check entry count limit
    if (this.memoryCache.size > this.config.maxMemoryEntries) {
      this.evictLRU(this.memoryCache.size - this.config.maxMemoryEntries);
    }

    // Check memory size limit
    if (this.stats.memorySize > this.config.maxMemorySize) {
      // Evict 20% of entries to create headroom
      const entriesToEvict = Math.floor(this.memoryCache.size * 0.2);
      this.evictLRU(entriesToEvict);
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(count: number): void {
    // Convert to array and sort by timestamp (oldest first)
    const entries = Array.from(this.memoryCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    // Remove oldest entries
    for (let i = 0; i < count && i < entries.length; i++) {
      this.memoryCache.delete(entries[i][0]);
      this.stats.evictions++;
    }

    this.updateMemoryStats();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.memoryCache.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.updateMemoryStats();
      console.info(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit ratio
   */
  public getHitRatio(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear memory cache
    this.memoryCache.clear();

    // Close IndexedDB
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}