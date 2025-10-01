/**
 * Main Layout Component
 * CSS Grid-based 3-column layout: Sidebar + Primary + Secondary
 */

import { AuthComponent } from '../auth/AuthComponent';
import { DebugLogger } from '../debug/DebugLogger';
import { UserStatus } from '../ui/UserStatus';
import { CacheControl } from '../ui/CacheControl';
import { Router } from '../../services/Router';

export class MainLayout {
  private element: HTMLElement;
  private debugLogger: DebugLogger;
  private userStatus: UserStatus | null = null;
  private authComponent: any = null; // Store reference to trigger logout
  private cacheControl: CacheControl;

  constructor() {
    this.element = this.createElement();
    this.debugLogger = DebugLogger.getInstance();
    this.cacheControl = new CacheControl({
      style: 'button',
      showStats: true,
      showClearButton: true
    });
    this.setupNavigationLinks();
    this.initializeContent();
  }

  /**
   * Setup navigation links to use router instead of page reload
   */
  private setupNavigationLinks(): void {
    const homeLink = this.element.querySelector('.sidebar a[href="/"]');
    if (homeLink) {
      homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        const router = Router.getInstance();
        router.navigate('/');
      });
    }
  }

  /**
   * Create the main layout structure
   */
  private createElement(): HTMLElement {
    const layout = document.createElement('div');
    layout.className = 'main-layout';
    layout.innerHTML = `
      <aside class="sidebar">
        <div class="sidebar-content">
          <div class="sidebar-header">
            <!-- Logo container for later -->
          </div>
          <ul>
            <li><a href="/">Home</a></li>
            <li>Profile</li>
            <li>Messages</li>
            <li>Settings</li>
          </ul>
          <div class="sidebar-footer">
            <p>User Info</p>
            <div class="cache-control-container">
              <!-- Cache control will be mounted here -->
            </div>
          </div>
        </div>
      </aside>

      <main class="primary-content">
        <div class="content-wrapper">
          <!-- Content will be dynamically updated based on auth state -->
        </div>
      </main>

      <aside class="secondary-content">
        <div class="content-wrapper">
          <div class="secondary-header">
            <div class="secondary-title">
              <h2>System Log</h2>
            </div>
            <div class="secondary-user">
              <!-- User status will be mounted here -->
            </div>
          </div>
          <div class="secondary-content-body">
            <!-- Debug Logger will be mounted here -->
          </div>
        </div>
      </aside>
    `;

    return layout;
  }

  /**
   * Get the layout element for mounting
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Update sidebar content
   */
  public updateSidebar(content: string): void {
    const sidebar = this.element.querySelector('.sidebar-content');
    if (sidebar) {
      sidebar.innerHTML = content;
    }
  }

  /**
   * Update primary content
   */
  public updatePrimaryContent(content: string): void {
    const primary = this.element.querySelector('.primary-content .content-wrapper');
    if (primary) {
      primary.innerHTML = content;
    }
  }

  /**
   * Update secondary content
   */
  public updateSecondaryContent(content: string): void {
    const secondary = this.element.querySelector('.secondary-content .content-wrapper');
    if (secondary) {
      secondary.innerHTML = content;
    }
  }

  /**
   * Set user status in secondary header
   */
  public setUserStatus(npub: string, pubkey: string): void {
    // Clean up existing user status
    if (this.userStatus) {
      this.userStatus.destroy();
    }

    // Create new user status with logout callback
    this.userStatus = new UserStatus({
      npub,
      pubkey,
      onLogout: () => this.handleLogout()
    });

    // Mount in secondary user area
    const secondaryUser = this.element.querySelector('.secondary-user');
    if (secondaryUser) {
      secondaryUser.innerHTML = '';
      secondaryUser.appendChild(this.userStatus.getElement());
    }
  }

  /**
   * Handle logout from UserStatus component
   */
  private handleLogout(): void {
    if (this.authComponent && this.authComponent.handleLogout) {
      // Call AuthComponent's logout method
      this.authComponent.handleLogout();
    }
  }

  /**
   * Clear user status (on logout)
   */
  public clearUserStatus(): void {
    if (this.userStatus) {
      this.userStatus.destroy();
      this.userStatus = null;
    }

    const secondaryUser = this.element.querySelector('.secondary-user');
    if (secondaryUser) {
      secondaryUser.innerHTML = '';
    }
  }

  /**
   * Initialize primary content with auth component and secondary content with debug logger
   */
  private initializeContent(): void {
    // Create and mount auth component in primary content
    this.authComponent = new AuthComponent(this);
    const primaryContent = this.element.querySelector('.primary-content .content-wrapper');
    if (primaryContent) {
      primaryContent.appendChild(this.authComponent.getElement());
    }

    // Mount debug logger in secondary content body
    const secondaryBody = this.element.querySelector('.secondary-content-body');
    if (secondaryBody) {
      secondaryBody.appendChild(this.debugLogger.getElement());
    }

    // Mount cache control in sidebar footer
    const cacheContainer = this.element.querySelector('.cache-control-container');
    if (cacheContainer) {
      cacheContainer.appendChild(this.cacheControl.getElement());
    }

    // Add initial log messages
    this.debugLogger.info('System', 'Noornote application started');
    this.debugLogger.debug('Layout', 'MainLayout initialized with DebugLogger');
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.userStatus) {
      this.userStatus.destroy();
    }
    if (this.cacheControl) {
      this.cacheControl.destroy();
    }
    this.element.remove();
  }
}