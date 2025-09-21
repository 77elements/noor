/**
 * Authentication Component
 * Handles login/logout UI and authentication flow
 */

import { AuthService } from '../../services/AuthService';
import { TimelineComponent } from '../timeline/TimelineComponent';
import { DebugLogger } from '../debug/DebugLogger';

// Forward declaration to avoid circular dependency
interface MainLayoutInterface {
  setUserStatus(npub: string, pubkey: string): void;
  clearUserStatus(): void;
}

export class AuthComponent {
  private element: HTMLElement;
  private authService: AuthService;
  private debugLogger: DebugLogger;
  private mainLayout: MainLayoutInterface | null = null;
  private currentUser: { npub: string; pubkey: string } | null = null;
  private timelineComponent: TimelineComponent | null = null;

  constructor(mainLayout?: MainLayoutInterface) {
    this.authService = new AuthService();
    this.debugLogger = DebugLogger.getInstance();
    this.mainLayout = mainLayout || null;
    this.element = this.createElement();
    this.setupEventListeners();
  }

  /**
   * Create the authentication component UI
   */
  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'auth-component';

    if (this.currentUser) {
      // User is authenticated - show timeline
      container.innerHTML = `
        <div class="authenticated-content">
          <div class="timeline-container">
            <!-- Timeline will be mounted here -->
          </div>
        </div>
      `;
    } else {
      // User not authenticated - show login options
      const isExtensionAvailable = this.authService.isExtensionAvailable();

      container.innerHTML = `
        <div class="auth-container">
          <h2>Welcome to Noornote</h2>
          <p>Please authenticate to continue</p>

          <div class="auth-status unauthenticated">
            <h3>Authentication Required</h3>
            ${isExtensionAvailable
              ? `
                <p>Extension detected: ${this.authService.getExtensionName()}</p>
                <button class="login-btn" type="button">Connect with Extension</button>
              `
              : `
                <div class="no-extension">
                  <p class="error">No Nostr extension found</p>
                  <p>Please install a Nostr browser extension:</p>
                  <ul class="extension-list">
                    <li><a href="https://getalby.com/" target="_blank">Alby (Recommended)</a></li>
                    <li><a href="https://github.com/fiatjaf/nos2x" target="_blank">nos2x</a></li>
                    <li><a href="https://flamingo.me/" target="_blank">Flamingo</a></li>
                  </ul>
                  <button class="retry-btn" type="button">Retry Detection</button>
                </div>
              `
            }
          </div>
        </div>
      `;
    }

    return container;
  }

  /**
   * Setup event listeners for authentication actions
   */
  private setupEventListeners(): void {
    // Login button
    const loginBtn = this.element.querySelector('.login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', this.handleLogin.bind(this));
    }

    // No logout button here anymore - it's in UserStatus component

    // Retry detection button
    const retryBtn = this.element.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', this.handleRetry.bind(this));
    }
  }

  /**
   * Handle login attempt
   */
  private async handleLogin(): Promise<void> {
    const loginBtn = this.element.querySelector('.login-btn') as HTMLButtonElement;
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Connecting...';
    }

    try {
      const result = await this.authService.authenticate();

      if (result.success && result.npub && result.pubkey) {
        // Authentication successful - store user and update UI
        this.currentUser = { npub: result.npub, pubkey: result.pubkey };
        this.debugLogger.info('Auth', 'Logged in successfully via extension');

        // Update main layout user status
        if (this.mainLayout) {
          this.mainLayout.setUserStatus(result.npub, result.pubkey);
        }

        this.updateUI();
        this.initializeTimeline();
      } else {
        // Authentication failed
        this.debugLogger.error('Auth', 'Login failed');
        this.showError(result.error || 'Authentication failed');
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = 'Connect with Extension';
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showError('Unexpected error during authentication');
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Connect with Extension';
      }
    }
  }

  /**
   * Handle logout
   */
  public handleLogout(): void {
    this.authService.signOut();
    this.currentUser = null;

    // Clear main layout user status
    if (this.mainLayout) {
      this.mainLayout.clearUserStatus();
    }

    this.updateUI();
  }

  /**
   * Handle retry extension detection
   */
  private handleRetry(): void {
    this.updateUI();
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const existingError = this.element.querySelector('.auth-error');
    if (existingError) {
      existingError.remove();
    }

    const errorElement = document.createElement('div');
    errorElement.className = 'auth-error';
    errorElement.innerHTML = `
      <p class="error">${message}</p>
    `;

    this.element.appendChild(errorElement);

    // Remove error after 5 seconds
    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.remove();
      }
    }, 5000);
  }

  /**
   * Update the UI based on current authentication state
   */
  private updateUI(): void {
    const newElement = this.createElement();
    this.element.parentNode?.replaceChild(newElement, this.element);
    this.element = newElement;
    this.setupEventListeners();
  }

  /**
   * Get the DOM element
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Initialize timeline after authentication
   */
  private initializeTimeline(): void {
    if (!this.currentUser) return;

    const timelineContainer = this.element.querySelector('.timeline-container');
    if (timelineContainer) {
      // Create and mount timeline component
      this.timelineComponent = new TimelineComponent(this.currentUser.pubkey);
      timelineContainer.appendChild(this.timelineComponent.getElement());
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.timelineComponent) {
      this.timelineComponent.destroy();
    }
    this.element.remove();
  }
}