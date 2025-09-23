/**
 * Infinite Scroll Component
 * Single responsibility: Detect when user scrolls near bottom and emit load event
 * Uses IntersectionObserver to efficiently monitor scroll position
 */

export interface InfiniteScrollConfig {
  rootMargin?: string;
  threshold?: number;
  debounceMs?: number;
}

export class InfiniteScroll {
  private observer: IntersectionObserver | null = null;
  private targetElement: HTMLElement | null = null;
  private onLoadMore: () => void;
  private debounceTimer: number | null = null;
  private config: InfiniteScrollConfig;

  constructor(onLoadMore: () => void, config: InfiniteScrollConfig = {}) {
    this.onLoadMore = onLoadMore;
    this.config = {
      rootMargin: config.rootMargin || '50px',
      threshold: config.threshold || 0.1,
      debounceMs: config.debounceMs || 300
    };
  }

  /**
   * Start observing a target element for intersection
   */
  observe(targetElement: HTMLElement): void {
    this.targetElement = targetElement;

    if (this.observer) {
      this.disconnect();
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.triggerLoadMore();
          }
        });
      },
      {
        rootMargin: this.config.rootMargin!,
        threshold: this.config.threshold!
      }
    );

    this.observer.observe(targetElement);
  }

  /**
   * Stop observing
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Temporarily pause observation
   */
  pause(): void {
    if (this.observer && this.targetElement) {
      this.observer.unobserve(this.targetElement);
    }
  }

  /**
   * Resume observation
   */
  resume(): void {
    if (this.observer && this.targetElement) {
      this.observer.observe(this.targetElement);
    }
  }

  /**
   * Debounced trigger to prevent rapid fire events
   */
  private triggerLoadMore(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      this.onLoadMore();
    }, this.config.debounceMs!);
  }
}