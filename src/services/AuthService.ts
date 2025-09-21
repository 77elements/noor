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
  private extension: NostrExtension | null = null;
  private currentUser: { npub: string; pubkey: string } | null = null;

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
}