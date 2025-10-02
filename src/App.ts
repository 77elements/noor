/**
 * Main Application Class
 * Coordinates all application modules and manages the application lifecycle
 */

import { MainLayout } from './components/layout/MainLayout';
import { Router } from './services/Router';
import { AppState } from './services/AppState';
import { SingleNoteView } from './components/views/SingleNoteView';
import { TimelineUI } from './components/timeline/TimelineUI';
import { AuthService } from './services/AuthService';

export class App {
  private appElement: HTMLElement | null = null;
  private mainLayout: MainLayout | null = null;
  private router: Router;
  private appState: AppState;
  private authService: AuthService;
  private timelineUI: TimelineUI | null = null;

  constructor() {
    this.appElement = document.getElementById('app');
    if (!this.appElement) {
      throw new Error('App element not found');
    }

    this.router = Router.getInstance();
    this.appState = AppState.getInstance();
    this.authService = AuthService.getInstance();
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    // Setup routing FIRST
    this.setupRoutes();

    // Setup the main UI
    this.setupUI();

    // Setup event listeners
    this.setupEventListeners();

    // Navigate to current route (now that routes are registered)
    this.router.navigate(window.location.pathname);
  }

  /**
   * Setup application routes
   */
  private setupRoutes(): void {
    // Home route - Timeline view
    this.router.register('/', () => {
      console.log('📍 ROUTER: Navigating to Timeline View');
      this.appState.setState('view', { currentView: 'timeline' });
      this.mountPrimaryContent('timeline');
      this.mountSecondaryContent('debug-log');
    });

    // Single Note View route
    this.router.register('/note/:noteId', (params) => {
      console.log('📄 SNV: Loaded');
      this.appState.setState('view', {
        currentView: 'single-note',
        currentNoteId: params.noteId
      });
      this.mountPrimaryContent('single-note', params.noteId);
      this.mountSecondaryContent('debug-log');
    });

    // Profile View route (for future)
    this.router.register('/profile/:npub', (params) => {
      console.log('📍 ROUTER: Navigating to Profile View');
      this.appState.setState('view', {
        currentView: 'profile',
        currentProfileNpub: params.npub
      });
      this.mountPrimaryContent('profile', params.npub);
      this.mountSecondaryContent('debug-log');
    });
  }

  /**
   * Mount primary content based on route
   */
  private mountPrimaryContent(viewType: string, param?: string): void {
    const contentWrapper = document.querySelector('.primary-content .content-wrapper');
    if (!contentWrapper) return;

    // Clear existing content
    contentWrapper.innerHTML = '';

    // Mount appropriate view based on route
    switch (viewType) {
      case 'timeline': {
        // Timeline decides internally whether to show login prompt or actual timeline
        if (!this.timelineUI) {
          // Get current user from AuthService
          const currentUser = this.authService.getCurrentUser();
          if (currentUser) {
            this.timelineUI = new TimelineUI(currentUser.pubkey);
          }
        }

        if (this.timelineUI) {
          contentWrapper.appendChild(this.timelineUI.getElement());
        }
        break;
      }

      case 'single-note': {
        if (param) {
          const snv = new SingleNoteView(param);
          contentWrapper.appendChild(snv.getElement());
        }
        break;
      }

      case 'profile': {
        // TODO: ProfileView component
        contentWrapper.innerHTML = `<div>Profile View: ${param}</div>`;
        break;
      }
    }
  }

  /**
   * Mount secondary content based on route
   */
  private mountSecondaryContent(contentType: string): void {
    // Secondary content is currently always debug-log
    // In future: could be different per route (e.g., note details, profile info, etc.)
    // For now: Debug logger is already mounted in MainLayout, nothing to do
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