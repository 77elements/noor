/**
 * Authentication Service
 * Handles browser extension authentication (nos2x, Alby, Flamingo, etc.)
 */

export interface NostrExtension {
  getPublicKey(): Promise<string>;
  signEvent(event: any): Promise<any>;
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

declare global {
  interface Window {
    nostr?: NostrExtension;
  }
}

export class AuthService {
  private static instance: AuthService;
  private extension: NostrExtension | null = null;
  private currentUser: { npub: string; pubkey: string } | null = null;
  private readonly storageKey = 'noornote_auth_session';

  private constructor() {
    this.loadSession();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Check if a Nostr extension is available
   */
  public isExtensionAvailable(): boolean {
    return typeof window.nostr !== 'undefined';
  }

  /**
   * Get available extension name
   */
  public getExtensionName(): string {
    if (!this.isExtensionAvailable()) {
      return 'none';
    }

    // Try to detect specific extensions based on user agent or other methods
    // This is a simple heuristic - extensions don't always expose their identity
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('alby')) {
      return 'Alby';
    }

    // For now, return generic name if we can't detect specific extension
    return 'Browser Extension';
  }

  /**
   * Attempt to authenticate with browser extension
   */
  public async authenticate(): Promise<{ success: boolean; npub?: string; pubkey?: string; error?: string }> {
    if (!this.isExtensionAvailable()) {
      return {
        success: false,
        error: 'No Nostr extension found. Please install Alby, nos2x, or another Nostr browser extension.'
      };
    }

    try {
      this.extension = window.nostr!;

      // Get public key from extension
      const pubkey = await this.extension.getPublicKey();

      if (!pubkey) {
        return {
          success: false,
          error: 'Failed to get public key from extension'
        };
      }

      // Convert hex pubkey to npub format
      const npub = this.hexToNpub(pubkey);

      this.currentUser = { npub, pubkey };
      this.saveSession();

      return {
        success: true,
        npub,
        pubkey
      };
    } catch (error) {
      console.error('Authentication failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Get current authenticated user
   */
  public getCurrentUser(): { npub: string; pubkey: string } | null {
    return this.currentUser;
  }

  /**
   * Sign out current user
   */
  public signOut(): void {
    this.currentUser = null;
    this.extension = null;
    this.clearSession();
  }

  /**
   * Convert hex public key to npub format
   * Simplified implementation - in production use nostr-tools
   */
  private hexToNpub(hex: string): string {
    // For now, just show the hex with npub prefix for demo
    // In production, this should use proper bech32 encoding
    return `npub1${hex.slice(0, 10)}...${hex.slice(-10)}`;
  }

  /**
   * Get extension instance for signing operations
   */
  public getExtension(): NostrExtension | null {
    return this.extension;
  }

  /**
   * Check if user has a valid session
   */
  public hasValidSession(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Restore extension connection for existing session
   */
  public async restoreExtensionConnection(): Promise<boolean> {
    if (!this.currentUser || !this.isExtensionAvailable()) {
      return false;
    }

    try {
      this.extension = window.nostr!;

      // Verify the extension still has the same public key
      const currentPubkey = await this.extension.getPublicKey();

      if (currentPubkey === this.currentUser.pubkey) {
        return true;
      } else {
        // Public key mismatch - clear session
        this.clearSession();
        return false;
      }
    } catch (error) {
      console.warn('Failed to restore extension connection:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Load session from localStorage
   */
  private loadSession(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const sessionData = JSON.parse(stored);
        if (sessionData.npub && sessionData.pubkey && sessionData.timestamp) {
          // Check if session is not too old (24 hours)
          const sessionAge = Date.now() - sessionData.timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours

          if (sessionAge < maxAge) {
            this.currentUser = {
              npub: sessionData.npub,
              pubkey: sessionData.pubkey
            };
          } else {
            // Session expired
            this.clearSession();
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load session:', error);
      this.clearSession();
    }
  }

  /**
   * Save session to localStorage
   */
  private saveSession(): void {
    if (!this.currentUser) return;

    try {
      const sessionData = {
        npub: this.currentUser.npub,
        pubkey: this.currentUser.pubkey,
        timestamp: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
    } catch (error) {
      console.warn('Failed to save session:', error);
    }
  }

  /**
   * Clear session from localStorage
   */
  private clearSession(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }
    this.currentUser = null;
    this.extension = null;
  }
}