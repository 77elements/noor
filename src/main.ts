/**
 * Noornote - High-Performance Nostr Web Client
 * Main application entry point
 */

import { App } from './App';
import './styles/main.scss';

// Application initialization
async function init(): Promise<void> {
  try {
    // Initialize the main application
    const app = new App();
    await app.initialize();

    // Remove loading screen
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.remove();
    }

    console.info('Noornote initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Noornote:', error);

    // Show error message to user
    const appElement = document.getElementById('app');
    if (appElement) {
      appElement.innerHTML = `
        <div class="error-screen">
          <h2>Failed to load Noornote</h2>
          <p>Please refresh the page to try again.</p>
          <button onclick="window.location.reload()">Refresh</button>
        </div>
      `;
    }
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  void init();
}