/**
 * Minimal Vanilla JS Router
 * Handles client-side routing with history API
 */

export interface Route {
  pattern: RegExp;
  handler: (params: Record<string, string>) => void;
}

export class Router {
  private static instance: Router;
  private routes: Route[] = [];
  private currentPath: string = '';

  private constructor() {
    // Listen for browser back/forward
    window.addEventListener('popstate', () => {
      this.handleRoute(window.location.pathname);
    });

    // Handle initial route on page load
    this.handleRoute(window.location.pathname);
  }

  public static getInstance(): Router {
    if (!Router.instance) {
      Router.instance = new Router();
    }
    return Router.instance;
  }

  /**
   * Register a route with pattern and handler
   * @param pattern - Route pattern (e.g., /note/:id)
   * @param handler - Function to call when route matches
   */
  public register(pattern: string, handler: (params: Record<string, string>) => void): void {
    // Convert pattern to regex (e.g., /note/:id -> /note/([^/]+))
    const paramNames: string[] = [];
    const regexPattern = pattern.replace(/:([^/]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${regexPattern}$`);

    this.routes.push({
      pattern: regex,
      handler: (matches: Record<string, string>) => {
        // Map captured groups to param names
        const params: Record<string, string> = {};
        Object.keys(matches).forEach((key, index) => {
          if (paramNames[index]) {
            params[paramNames[index]] = matches[key];
          }
        });
        handler(params);
      }
    });
  }

  /**
   * Navigate to a new route
   * @param path - Path to navigate to (e.g., /note/abc123)
   */
  public navigate(path: string): void {
    if (path === this.currentPath) {
      return; // Already on this route
    }

    // Update browser history
    window.history.pushState({}, '', path);

    // Handle the route
    this.handleRoute(path);
  }

  /**
   * Go back in history
   */
  public back(): void {
    window.history.back();
  }

  /**
   * Get current path
   */
  public getCurrentPath(): string {
    return this.currentPath;
  }

  /**
   * Handle route matching and execution
   */
  private handleRoute(path: string): void {
    this.currentPath = path;

    // Find matching route
    for (const route of this.routes) {
      const match = path.match(route.pattern);
      if (match) {
        // Extract params (skip first match which is full string)
        const params: Record<string, string> = {};
        for (let i = 1; i < match.length; i++) {
          params[i.toString()] = match[i];
        }
        route.handler(params);
        return;
      }
    }

    // No route matched - show 404 or default route
    console.warn(`No route matched for: ${path}`);
  }
}
