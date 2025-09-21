/**
 * Debug Logger Component
 * Live debug logging with auto-scroll for debugging Timeline and Profile issues
 */

export type LogLevel = 'info' | 'debug' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

export class DebugLogger {
  private static instance: DebugLogger;
  private element: HTMLElement;
  private logs: LogEntry[] = [];
  private maxLogs = 500; // Keep last 500 logs
  private autoScroll = true;

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
   * Create debug logger UI
   */
  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'debug-logger';
    container.innerHTML = `
      <div class="debug-logger__content">
        <div class="debug-logger__logs"></div>
      </div>
    `;

    // Setup scroll detection
    const content = container.querySelector('.debug-logger__content');
    if (content) {
      content.addEventListener('scroll', () => this.handleScroll());
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
   * Add log entry
   */
  public log(level: LogLevel, category: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data
    };

    this.logs.push(entry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.renderLogs();

    if (this.autoScroll) {
      this.scrollToBottom();
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
   * Render logs to UI
   */
  private renderLogs(): void {
    const logsContainer = this.element.querySelector('.debug-logger__logs');
    if (!logsContainer) return;

    // Only render last 50 visible logs for performance
    const visibleLogs = this.logs.slice(-50);

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
   * Scroll to bottom
   */
  private scrollToBottom(): void {
    const content = this.element.querySelector('.debug-logger__content');
    if (content) {
      content.scrollTop = content.scrollHeight;
    }
  }

  /**
   * Handle scroll events to detect manual scrolling
   */
  private handleScroll(): void {
    const content = this.element.querySelector('.debug-logger__content');
    if (!content) return;

    const isAtBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 10;

    // Disable auto-scroll if user scrolled up manually
    if (!isAtBottom && this.autoScroll) {
      this.autoScroll = false;
      this.updateAutoScrollButton();
    }
  }

  /**
   * Toggle auto-scroll
   */
  private toggleAutoScroll(): void {
    this.autoScroll = !this.autoScroll;
    this.updateAutoScrollButton();

    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }

  /**
   * Update auto-scroll button text
   */
  private updateAutoScrollButton(): void {
    const btn = this.element.querySelector('.debug-logger__auto-scroll');
    if (btn) {
      btn.textContent = `Auto-scroll: ${this.autoScroll ? 'ON' : 'OFF'}`;
    }
  }

  /**
   * Clear all logs
   */
  public clear(): void {
    this.logs = [];
    this.renderLogs();
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