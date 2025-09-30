/**
 * Main Application Class
 * Coordinates all application modules and manages the application lifecycle
 */

import { MainLayout } from './components/layout/MainLayout';

export class App {
  private appElement: HTMLElement | null = null;
  private mainLayout: MainLayout | null = null;

  constructor() {
    this.appElement = document.getElementById('app');
    if (!this.appElement) {
      throw new Error('App element not found');
    }
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    // Setup the main UI
    this.setupUI();

    // Setup event listeners
    this.setupEventListeners();
  }


  /**
   * Setup the main application UI
   */
  private setupUI(): void {
    if (!this.appElement) return;

    // Create and mount the main layout
    this.mainLayout = new MainLayout();
    this.appElement.appendChild(this.mainLayout.getElement());
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));

    // Handle visibility change (for performance optimization)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  /**
   * Handle window resize events
   */
  private handleResize(): void {
    // Currently no responsive behavior needed - CSS handles layout
  }

  /**
   * Handle visibility change (tab switching)
   */
  private handleVisibilityChange(): void {
    // Currently no performance optimizations on visibility change
    // Nostr subscriptions are lightweight and can remain active
  }
}

// Global type declarations for Vite environment variables
declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;