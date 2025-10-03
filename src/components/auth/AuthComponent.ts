/**
 * Authentication Component
 * Handles login/logout UI and authentication flow
 */

import { AuthService } from '../../services/AuthService';
import { DebugLogger } from '../debug/DebugLogger';
import { Router } from '../../services/Router';
import { EventBus } from '../../services/EventBus';

// Forward declaration to avoid circular dependency
interface MainLayoutInterface {
  setUserStatus(npub: string, pubkey: string): void;
  clearUserStatus(): void;
}

export class AuthComponent {
  private element: HTMLElement;
  private authService: AuthService;
  private debugLogger: DebugLogger;
  private router: Router;
  private eventBus: EventBus;
  private mainLayout: MainLayoutInterface | null = null;
  private currentUser: { npub: string; pubkey: string } | null = null;

  constructor(mainLayout?: MainLayoutInterface) {
    this.authService = AuthService.getInstance();
    this.debugLogger = DebugLogger.getInstance();
    this.router = Router.getInstance();
    this.eventBus = EventBus.getInstance();
    this.mainLayout = mainLayout || null;

    // Check session BEFORE creating UI
    this.currentUser = this.authService.getCurrentUser();

    this.element = this.createElement();
    this.setupEventListeners();

    // Async session restore after UI is ready
    this.checkExistingSession();
  }

  /**
   * Create the authentication component UI
   */
  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'auth-component';

    if (this.currentUser) {
      // User is authenticated - show nothing (UserStatus shows username + logout)
      container.innerHTML = '';
    } else {
      // User not authenticated - show login button (same structure as UserStatus)
      const isExtensionAvailable = this.authService.isExtensionAvailable();

      container.innerHTML = `
        <div class="user-status">
          <div class="user-info">
            <span class="user-indicator">○</span>
            <span class="user-display">Not logged in</span>
          </div>
          <button class="login-btn logout-btn" type="button" ${!isExtensionAvailable ? 'disabled' : ''}>Login</button>
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

        // Emit user:login event to trigger Timeline recreation
        this.eventBus.emit('user:login', { npub: result.npub, pubkey: result.pubkey });
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
   * Check for existing session on component initialization
   */
  private async checkExistingSession(): Promise<void> {
    if (this.authService.hasValidSession()) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        this.debugLogger.info('Auth', 'Found existing session, attempting to restore');

        // Try to restore extension connection
        const restored = await this.authService.restoreExtensionConnection();

        if (restored) {
          this.currentUser = currentUser;
          this.debugLogger.info('Auth', 'Session restored successfully');

          // Update main layout user status
          if (this.mainLayout) {
            this.mainLayout.setUserStatus(currentUser.npub, currentUser.pubkey);
          }

          this.updateUI();

          // Reload current route to show Timeline
          this.router.navigate(window.location.pathname);
        } else {
          this.debugLogger.warn('Auth', 'Failed to restore session - extension unavailable or key mismatch');
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.element.remove();
  }
}