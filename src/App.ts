/**
 * Main Application Class
 * Coordinates all application modules and manages the application lifecycle
 */

import { MainLayout } from './components/layout/MainLayout';
import { Router } from './services/Router';
import { AppState } from './services/AppState';

export class App {
  private appElement: HTMLElement | null = null;
  private mainLayout: MainLayout | null = null;
  private router: Router;
  private appState: AppState;

  constructor() {
    this.appElement = document.getElementById('app');
    if (!this.appElement) {
      throw new Error('App element not found');
    }

    this.router = Router.getInstance();
    this.appState = AppState.getInstance();
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    // Setup routing
    this.setupRoutes();

    // Setup the main UI
    this.setupUI();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup application routes
   */
  private setupRoutes(): void {
    // Home route - Timeline view
    this.router.register('/', () => {
      console.log('📍 ROUTER: Navigating to Timeline View');
      this.appState.setState('view', { currentView: 'timeline' });
      this.showTimelineView();
    });

    // Single Note View route
    this.router.register('/note/:noteId', (params) => {
      console.log('📄 SNV: Loaded');
      this.appState.setState('view', {
        currentView: 'single-note',
        currentNoteId: params.noteId
      });
      this.showSingleNoteView(params.noteId);
    });

    // Profile View route (for future)
    this.router.register('/profile/:npub', (params) => {
      console.log('📍 ROUTER: Navigating to Profile View');
      this.appState.setState('view', {
        currentView: 'profile',
        currentProfileNpub: params.npub
      });
      console.log('👤 PROFILE: Loading user', params.npub);
      // TODO: Load ProfileView component
    });
  }

  /**
   * Show Timeline View (hide other views)
   */
  private showTimelineView(): void {
    // Timeline is already in MainLayout, just ensure it's visible
    const primaryContent = document.querySelector('.primary-content');
    if (primaryContent) {
      // Show existing timeline content
      const contentWrapper = primaryContent.querySelector('.content-wrapper');
      if (contentWrapper) {
        const timeline = contentWrapper.querySelector('.timeline-container');
        if (timeline) {
          (timeline as HTMLElement).style.display = 'block';
        }
      }
    }
  }

  /**
   * Show Single Note View (hide timeline)
   */
  private showSingleNoteView(noteId: string): void {
    const primaryContent = document.querySelector('.primary-content');
    if (!primaryContent) return;

    const contentWrapper = primaryContent.querySelector('.content-wrapper');
    if (!contentWrapper) return;

    // Hide timeline
    const timeline = contentWrapper.querySelector('.timeline-container');
    if (timeline) {
      (timeline as HTMLElement).style.display = 'none';
    }

    // Create empty SNV placeholder for now
    let snvContainer = contentWrapper.querySelector('.snv-container') as HTMLElement;
    if (!snvContainer) {
      snvContainer = document.createElement('div');
      snvContainer.className = 'snv-container';
      contentWrapper.appendChild(snvContainer);
    }

    snvContainer.style.display = 'block';
    snvContainer.innerHTML = `
      <div style="padding: 2rem;">
        <h1>Single Note View</h1>
        <p>Note ID: ${noteId}</p>
        <button onclick="history.back()">← Back to Timeline</button>
      </div>
    `;
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