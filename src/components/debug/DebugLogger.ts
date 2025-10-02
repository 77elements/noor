/**
 * Debug Logger Component
 * Live debug logging with auto-scroll for debugging Timeline and Profile issues
 * Split into 2 sections: Global (AppState, Router, UserService) + Page-specific (Timeline/SNV/Profile)
 */

export type LogLevel = 'info' | 'debug' | 'warn' | 'error';
export type LogCategory = 'global' | 'page';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  logCategory: LogCategory; // 'global' or 'page'
  message: string;
  data?: any;
}

// Global categories: AppState, Router, UserService, Auth
const GLOBAL_CATEGORIES = ['AppState', 'Router', 'UserService', 'Auth', 'USM'];

export class DebugLogger {
  private static instance: DebugLogger;
  private element: HTMLElement;
  private globalLogs: LogEntry[] = [];
  private pageLogs: LogEntry[] = [];
  private maxGlobalLogs = 5; // Keep only last 5 global logs
  private maxPageLogs = 500; // Keep last 500 page logs
  private globalAutoScroll = true;
  private pageAutoScroll = true;

  private constructor() {
    this.element = this.createElement();
    this.setupGlobalLogging();
  }

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  /**
   * Create debug logger UI with 2 sections
   */
  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'debug-logger';
    container.innerHTML = `
      <div class="debug-logger__global debug-section">
        <div class="debug-logger__global-header heading--sidebar-subheading">Global</div>
        <div class="debug-logger__global-content">
          <div class="debug-logger__global-logs"></div>
        </div>
      </div>
      <div class="debug-logger__page debug-section">
        <div class="debug-logger__page-header heading--sidebar-subheading">Local</div>
        <div class="debug-logger__page-content">
          <div class="debug-logger__page-logs"></div>
        </div>
      </div>
    `;

    // Setup scroll detection for both sections
    const globalContent = container.querySelector('.debug-logger__global-content');
    if (globalContent) {
      globalContent.addEventListener('scroll', () => this.handleGlobalScroll());
    }

    const pageContent = container.querySelector('.debug-logger__page-content');
    if (pageContent) {
      pageContent.addEventListener('scroll', () => this.handlePageScroll());
    }

    return container;
  }

  /**
   * Setup global console override for automatic logging
   */
  private setupGlobalLogging(): void {
    // Store original console methods
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    // Override console methods to also log to our debug logger
    console.log = (...args) => {
      originalConsole.log(...args);
      this.log('info', 'Console', args.join(' '));
    };

    console.info = (...args) => {
      originalConsole.info(...args);
      this.log('info', 'Console', args.join(' '));
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      this.log('warn', 'Console', args.join(' '));
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      this.log('error', 'Console', args.join(' '));
    };

    console.debug = (...args) => {
      originalConsole.debug(...args);
      this.log('debug', 'Console', args.join(' '));
    };
  }

  /**
   * Add log entry - automatically categorizes as global or page
   */
  public log(level: LogLevel, category: string, message: string, data?: any): void {
    // Determine if this is a global or page log
    const logCategory: LogCategory = GLOBAL_CATEGORIES.includes(category) ? 'global' : 'page';

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      logCategory,
      message,
      data
    };

    // Add to appropriate log array
    if (logCategory === 'global') {
      this.globalLogs.push(entry);
      // Keep only last N global logs
      if (this.globalLogs.length > this.maxGlobalLogs) {
        this.globalLogs = this.globalLogs.slice(-this.maxGlobalLogs);
      }
      this.renderGlobalLogs();
      if (this.globalAutoScroll) {
        this.scrollGlobalToBottom();
      }
    } else {
      this.pageLogs.push(entry);
      // Keep only last N page logs
      if (this.pageLogs.length > this.maxPageLogs) {
        this.pageLogs = this.pageLogs.slice(-this.maxPageLogs);
      }
      this.renderPageLogs();
      if (this.pageAutoScroll) {
        this.scrollPageToBottom();
      }
    }
  }

  /**
   * Convenience methods
   */
  public info(category: string, message: string, data?: any): void {
    this.log('info', category, message, data);
  }

  public debug(category: string, message: string, data?: any): void {
    this.log('debug', category, message, data);
  }

  public warn(category: string, message: string, data?: any): void {
    this.log('warn', category, message, data);
  }

  public error(category: string, message: string, data?: any): void {
    this.log('error', category, message, data);
  }

  /**
   * Render global logs to UI
   */
  private renderGlobalLogs(): void {
    const logsContainer = this.element.querySelector('.debug-logger__global-logs');
    if (!logsContainer) return;

    logsContainer.innerHTML = this.globalLogs.map(entry => this.renderLogEntry(entry)).join('');
  }

  /**
   * Render page logs to UI
   */
  private renderPageLogs(): void {
    const logsContainer = this.element.querySelector('.debug-logger__page-logs');
    if (!logsContainer) return;

    // Only render last 50 visible logs for performance
    const visibleLogs = this.pageLogs.slice(-50);

    logsContainer.innerHTML = visibleLogs.map(entry => this.renderLogEntry(entry)).join('');
  }

  /**
   * Render individual log entry
   */
  private renderLogEntry(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const levelClass = `debug-log-entry--${entry.level}`;
    const dataHtml = entry.data ? `<pre class="debug-log-entry__data">${JSON.stringify(entry.data, null, 2)}</pre>` : '';

    return `
      <div class="debug-log-entry ${levelClass}">
        <span class="debug-log-entry__time">${time}</span>
        <span class="debug-log-entry__level">[${entry.level.toUpperCase()}]</span>
        <span class="debug-log-entry__category">[${entry.category}]</span>
        <span class="debug-log-entry__message">${this.escapeHtml(entry.message)}</span>
        ${dataHtml}
      </div>
    `;
  }

  /**
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Scroll global section to bottom
   */
  private scrollGlobalToBottom(): void {
    const content = this.element.querySelector('.debug-logger__global-content');
    if (content) {
      content.scrollTop = content.scrollHeight;
    }
  }

  /**
   * Scroll page section to bottom
   */
  private scrollPageToBottom(): void {
    const content = this.element.querySelector('.debug-logger__page-content');
    if (content) {
      content.scrollTop = content.scrollHeight;
    }
  }

  /**
   * Handle global section scroll events
   */
  private handleGlobalScroll(): void {
    const content = this.element.querySelector('.debug-logger__global-content');
    if (!content) return;

    const isAtBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 10;

    // Toggle auto-scroll based on scroll position
    if (isAtBottom && !this.globalAutoScroll) {
      this.globalAutoScroll = true; // Re-enable if user scrolled back to bottom
    } else if (!isAtBottom && this.globalAutoScroll) {
      this.globalAutoScroll = false; // Disable if user scrolled up
    }
  }

  /**
   * Handle page section scroll events
   */
  private handlePageScroll(): void {
    const content = this.element.querySelector('.debug-logger__page-content');
    if (!content) return;

    const isAtBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 10;

    // Toggle auto-scroll based on scroll position
    if (isAtBottom && !this.pageAutoScroll) {
      this.pageAutoScroll = true; // Re-enable if user scrolled back to bottom
    } else if (!isAtBottom && this.pageAutoScroll) {
      this.pageAutoScroll = false; // Disable if user scrolled up
    }
  }

  /**
   * Clear all logs
   */
  public clear(): void {
    this.globalLogs = [];
    this.pageLogs = [];
    this.renderGlobalLogs();
    this.renderPageLogs();
  }

  /**
   * Clear only page logs (for view transitions)
   */
  public clearPageLogs(): void {
    this.pageLogs = [];
    this.renderPageLogs();
  }

  /**
   * Get DOM element
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Destroy logger and restore console
   */
  public destroy(): void {
    // Restore original console methods would go here if needed
    this.element.remove();
  }
}