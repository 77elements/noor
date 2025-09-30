/**
 * NoteHeader Component
 * Reusable note header with profile photo, username, verification, and timestamp
 * Container-width independent with flexible layout
 */

import { UserProfileService, UserProfile } from '../../services/UserProfileService';

export interface NoteHeaderOptions {
  pubkey: string;
  timestamp: number;
  showVerification?: boolean;
  showTimestamp?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: (pubkey: string) => void;
}

export class NoteHeader {
  private element: HTMLElement;
  private userProfileService: UserProfileService;
  private options: Required<NoteHeaderOptions>;
  private profile: UserProfile | null = null;
  private unsubscribeProfile?: () => void;

  constructor(options: NoteHeaderOptions) {
    this.userProfileService = UserProfileService.getInstance();
    this.options = {
      showVerification: true,
      showTimestamp: true,
      size: 'medium',
      onClick: () => {},
      ...options
    };

    this.element = this.createElement();
    this.loadProfile();
  }

  /**
   * Create the note header element
   */
  private createElement(): HTMLElement {
    const header = document.createElement('div');
    header.className = `note-header note-header--${this.options.size}`;

    if (this.options.onClick && this.options.onClick.toString() !== (() => {}).toString()) {
      header.classList.add('note-header--clickable');
      header.addEventListener('click', () => this.options.onClick(this.options.pubkey));
    }

    header.innerHTML = `
      <div class="note-header__avatar">
        <img class="note-header__avatar-img" src="" alt="Avatar" loading="lazy" />
      </div>
      <div class="note-header__info">
        <div class="note-header__primary-line">
          <span class="note-header__display-name">Loading...</span>
          ${this.options.showVerification ? '<span class="note-header__verification" style="display: none;">✓</span>' : ''}
          ${this.options.showTimestamp ? `<time class="note-header__timestamp">${this.formatTimeAgo(this.options.timestamp)}</time>` : ''}
        </div>
        <div class="note-header__handle">@loading...</div>
      </div>
    `;

    return header;
  }

  /**
   * Load user profile and update display (reactive pattern like nostr-react)
   */
  private async loadProfile(): Promise<void> {
    // Show fallback immediately
    this.showFallbackDisplay();

    // Subscribe to profile updates (reactive like useProfile hook)
    this.unsubscribeProfile = this.userProfileService.subscribeToProfile(
      this.options.pubkey,
      (profile: UserProfile) => {
        this.profile = profile;
        this.updateDisplay();
      }
    );

    // Trigger initial load
    try {
      await this.userProfileService.getUserProfile(this.options.pubkey);
    } catch (error) {
      console.warn(`Failed to load profile for note header: ${this.options.pubkey}`, error);
    }
  }

  /**
   * Update display with loaded profile
   */
  private updateDisplay(): void {
    if (!this.profile) return;

    const avatarImg = this.element.querySelector('.note-header__avatar-img') as HTMLImageElement;
    const displayName = this.element.querySelector('.note-header__display-name');
    const handle = this.element.querySelector('.note-header__handle');
    const verification = this.element.querySelector('.note-header__verification');

    // Update avatar
    if (avatarImg) {
      const imageUrl = this.userProfileService.getProfilePicture(this.profile.pubkey);
      avatarImg.src = imageUrl;
      avatarImg.alt = this.userProfileService.getUsername(this.profile.pubkey);
    }

    // Update display name
    if (displayName) {
      displayName.textContent = this.userProfileService.getUsername(this.profile.pubkey);
    }

    // Update handle
    if (handle) {
      handle.textContent = `@${this.userProfileService.getUsername(this.profile.pubkey)}`;
    }

    // Update verification
    if (verification && this.options.showVerification) {
      if (this.userProfileService.isVerified(this.profile)) {
        verification.style.display = 'inline-flex';
        verification.setAttribute('title', `Verified: ${this.profile.nip05}`);
      } else {
        verification.style.display = 'none';
      }
    }
  }

  /**
   * Show fallback display when profile loading fails
   */
  private showFallbackDisplay(): void {
    const avatarImg = this.element.querySelector('.note-header__avatar-img') as HTMLImageElement;
    const displayName = this.element.querySelector('.note-header__display-name');
    const handle = this.element.querySelector('.note-header__handle');

    if (avatarImg) {
      avatarImg.src = '';
    }

    if (displayName) {
      displayName.textContent = `${this.options.pubkey.slice(0, 8)}...`;
    }

    if (handle) {
      handle.textContent = `npub1${this.options.pubkey.slice(0, 10)}...`;
    }
  }

  /**
   * Format timestamp to human readable
   */
  private formatTimeAgo(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    // For recent posts, show relative time
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;

    // For posts older than 1 hour, show absolute date/time
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Check if it's this year
    if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Older posts: full date
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Update timestamp (for live updates)
   */
  public updateTimestamp(): void {
    const timestampEl = this.element.querySelector('.note-header__timestamp');
    if (timestampEl && this.options.showTimestamp) {
      timestampEl.textContent = this.formatTimeAgo(this.options.timestamp);
    }
  }

  /**
   * Update options and re-render
   */
  public updateOptions(newOptions: Partial<NoteHeaderOptions>): void {
    this.options = { ...this.options, ...newOptions };

    // If pubkey changed, reload profile
    if (newOptions.pubkey && newOptions.pubkey !== this.options.pubkey) {
      this.profile = null;
      this.loadProfile();
    } else {
      this.updateDisplay();
    }
  }

  /**
   * Get the DOM element
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Get current profile
   */
  public getProfile(): UserProfile | null {
    return this.profile;
  }

  /**
   * Set custom CSS classes
   */
  public addClass(className: string): void {
    this.element.classList.add(className);
  }

  public removeClass(className: string): void {
    this.element.classList.remove(className);
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Unsubscribe from profile updates
    if (this.unsubscribeProfile) {
      this.unsubscribeProfile();
    }
    this.element.remove();
  }

  /**
   * Create a note header from HTML attributes (for easy integration)
   */
  public static fromElement(element: HTMLElement): NoteHeader | null {
    const pubkey = element.dataset.pubkey;
    const timestamp = element.dataset.timestamp;

    if (!pubkey || !timestamp) {
      console.warn('NoteHeader requires data-pubkey and data-timestamp attributes');
      return null;
    }

    const options: NoteHeaderOptions = {
      pubkey,
      timestamp: parseInt(timestamp, 10),
      size: (element.dataset.size as any) || 'medium',
      showVerification: element.dataset.showVerification !== 'false',
      showTimestamp: element.dataset.showTimestamp !== 'false'
    };

    const noteHeader = new NoteHeader(options);
    element.appendChild(noteHeader.getElement());

    return noteHeader;
  }

  /**
   * Initialize all note headers in a container
   */
  public static initializeAll(container: HTMLElement = document.body): NoteHeader[] {
    const elements = container.querySelectorAll('[data-note-header]');
    const headers: NoteHeader[] = [];

    elements.forEach(element => {
      const header = NoteHeader.fromElement(element as HTMLElement);
      if (header) {
        headers.push(header);
      }
    });

    return headers;
  }
}