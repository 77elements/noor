/**
 * Main Layout Component
 * CSS Grid-based 3-column layout: Sidebar + Primary + Secondary
 */

export class MainLayout {
  private element: HTMLElement;

  constructor() {
    this.element = this.createElement();
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
          <h2>Sidebar</h2>
          <p>Fixed width: ~120px</p>
          <ul>
            <li>Home</li>
            <li>Profile</li>
            <li>Messages</li>
            <li>Settings</li>
          </ul>
          <div class="sidebar-footer">
            <p>User Info</p>
          </div>
        </div>
      </aside>

      <main class="primary-content">
        <div class="content-wrapper">
          <h2>Primary Content</h2>
          <p>50% width of main container</p>
          <div class="timeline-placeholder">
            <div class="post-item">
              <h4>Post 1</h4>
              <p>This is a sample post in the primary timeline...</p>
            </div>
            <div class="post-item">
              <h4>Post 2</h4>
              <p>Another post with some content...</p>
            </div>
            <div class="post-item">
              <h4>Post 3</h4>
              <p>More timeline content here...</p>
            </div>
          </div>
        </div>
      </main>

      <aside class="secondary-content">
        <div class="content-wrapper">
          <h2>Secondary Content</h2>
          <p>50% width of main container</p>
          <div class="widget-placeholder">
            <div class="widget">
              <h4>Trending</h4>
              <ul>
                <li>#nostr</li>
                <li>#bitcoin</li>
                <li>#decentralized</li>
              </ul>
            </div>
            <div class="widget">
              <h4>Suggested Users</h4>
              <ul>
                <li>@user1</li>
                <li>@user2</li>
                <li>@user3</li>
              </ul>
            </div>
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
   * Cleanup resources
   */
  public destroy(): void {
    this.element.remove();
  }
}