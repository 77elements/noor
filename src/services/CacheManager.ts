/**
 * Cache Manager Service
 * Centralized cache management for localStorage, sessionStorage, and app data
 */

import { getStorageSize } from '../helpers/getStorageSize';

export interface CacheStats {
  localStorage: {
    size: number;
    items: number;
  };
  sessionStorage: {
    size: number;
    items: number;
  };
  total: {
    size: number;
    items: number;
  };
}

export interface ClearCacheOptions {
  localStorage?: boolean;
  sessionStorage?: boolean;
  profileCache?: boolean;
  eventCache?: boolean;
  reload?: boolean;
}

export class CacheManager {
  private static instance: CacheManager;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get detailed cache statistics
   */
  public getCacheStats(): CacheStats {
    const localStorageSize = getStorageSize(localStorage);
    const sessionStorageSize = getStorageSize(sessionStorage);

    return {
      localStorage: {
        size: localStorageSize,
        items: localStorage.length
      },
      sessionStorage: {
        size: sessionStorageSize,
        items: sessionStorage.length
      },
      total: {
        size: localStorageSize + sessionStorageSize,
        items: localStorage.length + sessionStorage.length
      }
    };
  }

  /**
   * Clear caches based on options - equivalent to DevTools "Clear Site Data"
   */
  public async clearCache(options: ClearCacheOptions = {}): Promise<void> {
    const {
      localStorage: clearLocalStorage = true,
      sessionStorage: clearSessionStorage = true,
      profileCache = true,
      eventCache = true,
      reload = true
    } = options;

    console.log('🧹 CacheManager: Starting complete site data clear (like DevTools)');

    try {
      // Clear localStorage
      if (clearLocalStorage) {
        localStorage.clear();
        console.log('✅ localStorage cleared');
      }

      // Clear sessionStorage
      if (clearSessionStorage) {
        sessionStorage.clear();
        console.log('✅ sessionStorage cleared');
      }

      // Clear IndexedDB
      await this.clearIndexedDB();

      // Clear Cache Storage (Service Workers)
      await this.clearCacheStorage();

      // Clear specific profile cache if UserProfileService is available
      if (profileCache) {
        this.clearProfileCache();
      }

      // Clear event cache
      if (eventCache) {
        this.clearEventCache();
      }

      console.log('✅ Complete site data clear completed successfully (equivalent to DevTools)');

      // Reload page if requested
      if (reload) {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }

    } catch (error) {
      console.error('❌ Error during site data clear operation:', error);
      throw error;
    }
  }

  /**
   * Clear profile cache through UserProfileService
   */
  private clearProfileCache(): void {
    try {
      // Try to access UserProfileService if available
      const userProfileService = (window as any).userProfileService;
      if (userProfileService && typeof userProfileService.clearCache === 'function') {
        userProfileService.clearCache();
        console.log('✅ Profile cache cleared');
      } else {
        console.log('ℹ️ UserProfileService not available for cache clearing');
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear profile cache:', error);
    }
  }

  /**
   * Clear event cache (legacy placeholder)
   */
  private clearEventCache(): void {
    // Event cache clearing is now handled by individual services
    console.log('ℹ️ Event cache clearing delegated to individual services');
  }

  /**
   * Clear all IndexedDB databases
   */
  private async clearIndexedDB(): Promise<void> {
    try {
      if (!('indexedDB' in window)) {
        console.log('ℹ️ IndexedDB not supported');
        return;
      }

      // Get list of all databases
      const databases = await indexedDB.databases();

      if (databases.length === 0) {
        console.log('ℹ️ No IndexedDB databases to clear');
        return;
      }

      // Delete each database
      const deletePromises = databases.map(dbInfo => {
        return new Promise<void>((resolve, reject) => {
          if (!dbInfo.name) {
            resolve();
            return;
          }

          const deleteRequest = indexedDB.deleteDatabase(dbInfo.name);

          deleteRequest.onsuccess = () => {
            console.log(`✅ IndexedDB database '${dbInfo.name}' deleted`);
            resolve();
          };

          deleteRequest.onerror = () => {
            console.warn(`⚠️ Failed to delete IndexedDB database '${dbInfo.name}'`);
            resolve(); // Don't reject, continue with others
          };

          deleteRequest.onblocked = () => {
            console.warn(`⚠️ IndexedDB database '${dbInfo.name}' deletion blocked`);
            resolve(); // Don't reject, continue with others
          };
        });
      });

      await Promise.all(deletePromises);
      console.log('✅ All IndexedDB databases cleared');

    } catch (error) {
      console.warn('⚠️ Failed to clear IndexedDB:', error);
    }
  }

  /**
   * Clear Cache Storage (Service Workers)
   */
  private async clearCacheStorage(): Promise<void> {
    try {
      if (!('caches' in window)) {
        console.log('ℹ️ Cache Storage not supported');
        return;
      }

      // Get all cache names
      const cacheNames = await caches.keys();

      if (cacheNames.length === 0) {
        console.log('ℹ️ No Cache Storage to clear');
        return;
      }

      // Delete each cache
      const deletePromises = cacheNames.map(async (cacheName) => {
        try {
          await caches.delete(cacheName);
          console.log(`✅ Cache Storage '${cacheName}' deleted`);
        } catch (error) {
          console.warn(`⚠️ Failed to delete cache '${cacheName}':`, error);
        }
      });

      await Promise.all(deletePromises);
      console.log('✅ All Cache Storage cleared');

    } catch (error) {
      console.warn('⚠️ Failed to clear Cache Storage:', error);
    }
  }

  /**
   * Get approximate size of storage in bytes
   */

  /**
   * Format bytes to human readable string
   */
  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Check if cache size exceeds threshold
   */
  public isCacheOversized(thresholdMB: number = 50): boolean {
    const stats = this.getCacheStats();
    const thresholdBytes = thresholdMB * 1024 * 1024;
    return stats.total.size > thresholdBytes;
  }
}