/**
 * RefreshButton Component
 * Smart refresh button that shows when new notes are available
 * Displays stacked profile pictures of note authors
 */

import { getProfilePicture } from '../../helpers/getProfilePicture';

export interface RefreshButtonOptions {
  newNotesCount: number;
  authorPubkeys: string[]; // Max 4, newest first
  onClick: () => void;
}

export class RefreshButton {
  private element: HTMLElement;
  private newNotesCount: number = 0;
  private authorPubkeys: string[] = [];
  private onClick: () => void;
  private avatarsContainer: HTMLElement | null = null;
  private textSpan: HTMLElement | null = null;

  constructor(options: RefreshButtonOptions) {
    this.newNotesCount = options.newNotesCount;
    this.authorPubkeys = options.authorPubkeys;
    this.onClick = options.onClick;
    this.element = this.createElement();
    this.updateContent();
  }

  /**
   * Create the button element
   */
  private createElement(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'refresh-btn refresh-btn--new-notes';
    button.type = 'button';
    button.style.display = 'none'; // Hidden by default

    button.innerHTML = `
      <div class="refresh-btn__avatars"></div>
      <span class="refresh-btn__text"></span>
    `;

    button.addEventListener('click', () => {
      this.onClick();
      this.hide(); // Hide after click
    });

    this.avatarsContainer = button.querySelector('.refresh-btn__avatars');
    this.textSpan = button.querySelector('.refresh-btn__text');

    return button;
  }

  /**
   * Update button content with new notes info
   */
  public async update(newNotesCount: number, authorPubkeys: string[]): Promise<void> {
    this.newNotesCount = newNotesCount;
    this.authorPubkeys = authorPubkeys.slice(0, 4); // Max 4 avatars
    await this.updateContent();
    this.show();
  }

  /**
   * Update avatars and text
   */
  private async updateContent(): Promise<void> {
    // Update text
    if (this.textSpan) {
      const plural = this.newNotesCount === 1 ? 'Note' : 'Notes';
      this.textSpan.textContent = `${this.newNotesCount} new ${plural} - Refresh`;
    }

    // Update avatars
    if (this.avatarsContainer) {
      this.avatarsContainer.innerHTML = ''; // Clear existing

      // Fetch and render avatars (max 4)
      const avatarPromises = this.authorPubkeys.map(pubkey => this.createAvatarElement(pubkey));
      const avatars = await Promise.all(avatarPromises);

      avatars.forEach(avatar => {
        this.avatarsContainer!.appendChild(avatar);
      });
    }
  }

  /**
   * Create a single avatar element
   */
  private async createAvatarElement(pubkey: string): Promise<HTMLElement> {
    const avatar = document.createElement('div');
    avatar.className = 'refresh-btn__avatar';

    try {
      const pictureUrl = await getProfilePicture(pubkey);
      avatar.style.backgroundImage = `url(${pictureUrl})`;
    } catch (error) {
      console.warn('Failed to load avatar for', pubkey, error);
      // Fallback will be handled by getProfilePicture
    }

    return avatar;
  }

  /**
   * Show the button
   */
  public show(): void {
    this.element.style.display = 'flex';
  }

  /**
   * Hide the button
   */
  public hide(): void {
    this.element.style.display = 'none';
  }

  /**
   * Get the DOM element
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Destroy the button
   */
  public destroy(): void {
    this.element.remove();
  }
}
