/**
 * Cache Control Component
 * UI component for displaying cache stats and clearing cache
 */

import { CacheManager, type CacheStats } from '../../services/CacheManager';

export interface CacheControlOptions {
  showStats?: boolean;
  showClearButton?: boolean;
  style?: 'button' | 'panel';
  onCacheCleared?: () => void;
}

export class CacheControl {
  private element: HTMLElement;
  private cacheManager: CacheManager;
  private options: CacheControlOptions;
  private statsUpdateInterval?: number;

  constructor(options: CacheControlOptions = {}) {
    this.cacheManager = CacheManager.getInstance();
    this.options = {
      showStats: true,
      showClearButton: true,
      style: 'button',
      ...options
    };
    this.element = this.createElement();
    this.setupEventListeners();

    if (this.options.showStats) {
      this.startStatsUpdates();
    }
  }

  /**
   * Create cache control element
   */
  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cache-control';

    if (this.options.style === 'button') {
      container.innerHTML = this.createButtonStyle();
    } else {
      container.innerHTML = this.createPanelStyle();
    }

    return container;
  }

  /**
   * Create simple button style (for sidebar)
   */
  private createButtonStyle(): string {
    return `
      <button class="clear-cache-btn" type="button" title="Clear app cache and reload">
        🧹 Clear Cache
      </button>
      ${this.options.showStats ? '<div class="cache-stats-mini"></div>' : ''}
    `;
  }

  /**
   * Create detailed panel style (for settings page)
   */
  private createPanelStyle(): string {
    return `
      <div class="cache-panel">
        <div class="cache-header">
          <h3>📱 App Cache</h3>
          <p>Manage app performance and storage optimization for smooth operation.</p>
        </div>

        ${this.options.showStats ? `
          <div class="cache-stats">
            <div class="cache-stats-grid">
              <div class="stat-item">
                <span class="stat-label">Total cached data:</span>
                <span class="stat-value" data-stat="total-size">--</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Profile cache:</span>
                <span class="stat-value" data-stat="profile-size">--</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Event cache:</span>
                <span class="stat-value" data-stat="event-size">--</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Storage items:</span>
                <span class="stat-value" data-stat="total-items">--</span>
              </div>
            </div>
          </div>
        ` : ''}

        ${this.options.showClearButton ? `
          <div class="cache-actions">
            <button class="clear-cache-btn primary-button" type="button">
              Clear Cache
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const clearButton = this.element.querySelector('.clear-cache-btn');
    if (clearButton) {
      clearButton.addEventListener('click', () => this.handleClearCache());
    }
  }

  /**
   * Handle clear cache button click
   */
  private async handleClearCache(): Promise<void> {
    const clearButton = this.element.querySelector('.clear-cache-btn') as HTMLButtonElement;

    if (!clearButton) return;

    // Update button state
    const originalText = clearButton.textContent;
    clearButton.textContent = 'Clearing...';
    clearButton.disabled = true;

    try {
      await this.cacheManager.clearCache({
        localStorage: true,
        sessionStorage: true,
        profileCache: true,
        eventCache: true,
        reload: true
      });

      // Show success (briefly, before reload)
      clearButton.textContent = '✅ Cleared!';

      // Call callback if provided
      if (this.options.onCacheCleared) {
        this.options.onCacheCleared();
      }

    } catch (error) {
      console.error('Failed to clear cache:', error);

      // Reset button on error
      clearButton.textContent = originalText;
      clearButton.disabled = false;

      // Show error state
      clearButton.textContent = '❌ Error';
      setTimeout(() => {
        clearButton.textContent = originalText;
      }, 2000);
    }
  }

  /**
   * Update cache statistics display
   */
  private updateStats(): void {
    const stats = this.cacheManager.getCacheStats();

    // Update mini stats (for button style)
    const miniStats = this.element.querySelector('.cache-stats-mini');
    if (miniStats) {
      const totalSize = this.cacheManager.formatBytes(stats.total.size);
      miniStats.textContent = `(${totalSize})`;
    }

    // Update detailed stats (for panel style)
    this.updateStatValue('total-size', this.cacheManager.formatBytes(stats.total.size));
    this.updateStatValue('profile-size', this.cacheManager.formatBytes(stats.localStorage.size / 2)); // Approximate
    this.updateStatValue('event-size', this.cacheManager.formatBytes(stats.localStorage.size / 2)); // Approximate
    this.updateStatValue('total-items', stats.total.items.toString());
  }

  /**
   * Update individual stat value
   */
  private updateStatValue(statName: string, value: string): void {
    const element = this.element.querySelector(`[data-stat="${statName}"]`);
    if (element) {
      element.textContent = value;
    }
  }

  /**
   * Start periodic stats updates
   */
  private startStatsUpdates(): void {
    this.updateStats(); // Initial update
    this.statsUpdateInterval = window.setInterval(() => {
      this.updateStats();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Stop stats updates
   */
  private stopStatsUpdates(): void {
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = undefined;
    }
  }

  /**
   * Get DOM element
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Update options and re-render
   */
  public updateOptions(newOptions: Partial<CacheControlOptions>): void {
    this.options = { ...this.options, ...newOptions };

    // Re-create element with new options
    const newElement = this.createElement();
    this.element.replaceWith(newElement);
    this.element = newElement;
    this.setupEventListeners();

    if (this.options.showStats) {
      this.startStatsUpdates();
    } else {
      this.stopStatsUpdates();
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopStatsUpdates();
    this.element.remove();
  }
}