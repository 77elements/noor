/**
 * Authentication Component
 * Handles login/logout UI and authentication flow
 */

import { AuthService } from '../../services/AuthService';

export class AuthComponent {
  private element: HTMLElement;
  private authService: AuthService;
  private currentUser: { npub: string; pubkey: string } | null = null;

  constructor() {
    this.authService = new AuthService();
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
      // User is authenticated - show their npub and user info
      container.innerHTML = `
        <div class="authenticated-content">
          <h2>Welcome to Noornote!</h2>
          <div class="user-info">
            <h3>Your Public Key:</h3>
            <p class="npub-display">${this.currentUser.npub}</p>
            <p class="pubkey-hex">Hex: ${this.currentUser.pubkey}</p>
          </div>
          <div class="next-steps">
            <p>Authentication successful! Timeline and other features will be implemented next.</p>
          </div>
          <button class="logout-btn" type="button">Sign Out</button>
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

    // Logout button
    const logoutBtn = this.element.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', this.handleLogout.bind(this));
    }

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
        this.updateUI();
      } else {
        // Authentication failed
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
  private handleLogout(): void {
    this.authService.signOut();
    this.currentUser = null;
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
   * Cleanup resources
   */
  public destroy(): void {
    this.element.remove();
  }
}