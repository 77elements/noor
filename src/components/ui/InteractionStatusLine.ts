/**
 * InteractionStatusLine (ISL) Component
 * Displays interaction stats and actions for a note: Reply, Repost, Like, Zap
 * Used in both Timeline View and Single Note View
 */

import { InteractionStatsService } from '../../services/InteractionStatsService';

export interface ISLStats {
  replies: number;
  reposts: number;
  likes: number;
  zaps: number;
}

export interface ISLConfig {
  noteId: string;
  stats?: ISLStats;
  fetchStats?: boolean;
  onReply?: () => void;
  onRepost?: () => void;
  onLike?: () => void;
  onZap?: () => void;
  onAnalytics?: () => void;
}

export class InteractionStatusLine {
  private element: HTMLElement;
  private config: ISLConfig;
  private stats: ISLStats;
  private interactionStatsService: InteractionStatsService;

  constructor(config: ISLConfig) {
    this.config = config;
    this.stats = config.stats || { replies: 0, reposts: 0, likes: 0, zaps: 0 };
    this.interactionStatsService = InteractionStatsService.getInstance();
    this.element = this.createElement();

    // Fetch stats in background if requested
    if (config.fetchStats) {
      this.fetchStats();
    }
  }

  /**
   * Fetch interaction stats from relays (background task)
   */
  private async fetchStats(): Promise<void> {
    try {
      const stats = await this.interactionStatsService.getStats(this.config.noteId);
      this.updateStats({
        replies: stats.replies,
        reposts: stats.reposts + stats.quotedReposts,
        likes: stats.likes,
        zaps: stats.zaps
      });
    } catch (error) {
      console.warn('Failed to load interaction stats:', error);
    }
  }

  /**
   * Create ISL element
   */
  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'isl';
    container.dataset.noteId = this.config.noteId;

    const analyticsHtml = this.config.onAnalytics
      ? `<button class="isl-action isl-analytics" type="button" title="View Analytics">
           <span class="isl-icon">📊</span>
         </button>`
      : '';

    container.innerHTML = `
      <button class="isl-action isl-reply" type="button" title="Reply">
        <span class="isl-icon">↩</span>
        <span class="isl-count">${this.formatCount(this.stats.replies)}</span>
      </button>

      <button class="isl-action isl-repost" type="button" title="Repost">
        <span class="isl-icon">↻</span>
        <span class="isl-count">${this.formatCount(this.stats.reposts)}</span>
      </button>

      <button class="isl-action isl-like" type="button" title="Like">
        <span class="isl-icon">♡</span>
        <span class="isl-count">${this.formatCount(this.stats.likes)}</span>
      </button>

      <button class="isl-action isl-zap" type="button" title="Zap">
        <span class="isl-icon">⚡</span>
        <span class="isl-count">${this.formatCount(this.stats.zaps)}</span>
      </button>

      ${analyticsHtml}
    `;

    this.attachEventListeners(container);

    return container;
  }

  /**
   * Attach event listeners to action buttons
   */
  private attachEventListeners(container: HTMLElement): void {
    const replyBtn = container.querySelector('.isl-reply');
    const repostBtn = container.querySelector('.isl-repost');
    const likeBtn = container.querySelector('.isl-like');
    const zapBtn = container.querySelector('.isl-zap');
    const analyticsBtn = container.querySelector('.isl-analytics');

    if (replyBtn) {
      replyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleReply();
      });
    }

    if (repostBtn) {
      repostBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleRepost();
      });
    }

    if (likeBtn) {
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleLike();
      });
    }

    if (zapBtn) {
      zapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleZap();
      });
    }

    if (analyticsBtn) {
      analyticsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleAnalytics();
      });
    }
  }

  /**
   * Format count for display (e.g., 1000 -> 1K)
   */
  private formatCount(count: number): string {
    if (count === 0) return '';
    if (count < 1000) return count.toString();
    if (count < 10000) return `${(count / 1000).toFixed(1)}K`;
    if (count < 1000000) return `${Math.floor(count / 1000)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  }

  /**
   * Handle reply action
   */
  private handleReply(): void {
    if (this.config.onReply) {
      this.config.onReply();
    } else {
      console.log('📝 Reply to note:', this.config.noteId);
    }
  }

  /**
   * Handle repost action
   */
  private handleRepost(): void {
    if (this.config.onRepost) {
      this.config.onRepost();
    } else {
      console.log('🔁 Repost note:', this.config.noteId);
    }
  }

  /**
   * Handle like action
   */
  private handleLike(): void {
    if (this.config.onLike) {
      this.config.onLike();
    } else {
      console.log('❤️ Like note:', this.config.noteId);
    }
  }

  /**
   * Handle zap action
   */
  private handleZap(): void {
    if (this.config.onZap) {
      this.config.onZap();
    } else {
      console.log('⚡ Zap note:', this.config.noteId);
    }
  }

  /**
   * Handle analytics action
   */
  private handleAnalytics(): void {
    if (this.config.onAnalytics) {
      this.config.onAnalytics();
    } else {
      console.log('📊 View analytics for note:', this.config.noteId);
    }
  }

  /**
   * Update stats
   */
  public updateStats(stats: Partial<ISLStats>): void {
    this.stats = { ...this.stats, ...stats };

    const repliesCount = this.element.querySelector('.isl-reply .isl-count');
    const repostsCount = this.element.querySelector('.isl-repost .isl-count');
    const likesCount = this.element.querySelector('.isl-like .isl-count');
    const zapsCount = this.element.querySelector('.isl-zap .isl-count');

    if (repliesCount && stats.replies !== undefined) {
      repliesCount.textContent = this.formatCount(stats.replies);
    }
    if (repostsCount && stats.reposts !== undefined) {
      repostsCount.textContent = this.formatCount(stats.reposts);
    }
    if (likesCount && stats.likes !== undefined) {
      likesCount.textContent = this.formatCount(stats.likes);
    }
    if (zapsCount && stats.zaps !== undefined) {
      zapsCount.textContent = this.formatCount(stats.zaps);
    }
  }

  /**
   * Get DOM element
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Destroy component
   */
  public destroy(): void {
    this.element.remove();
  }
}
