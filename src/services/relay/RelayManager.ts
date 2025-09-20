/**
 * Relay Manager Service
 * Handles relay connections, failover, and health monitoring
 */

import type { RelayConfig, RelayStatus, NostrError } from '@types/nostr';

/**
 * Relay connection health monitoring and failover management
 */
export class RelayManager {
  private relayConfigs: Map<string, RelayConfig> = new Map();
  private relayStatuses: Map<string, RelayStatus> = new Map();
  private healthCheckInterval: number | null = null;
  private reconnectTimers: Map<string, number> = new Map();

  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RECONNECT_DELAY = 30000; // 30 seconds
  private readonly RECONNECT_BACKOFF_FACTOR = 1.5;

  constructor(initialRelays: RelayConfig[] = []) {
    this.initializeRelays(initialRelays);
    this.startHealthMonitoring();
  }

  /**
   * Initialize relay configurations
   */
  private initializeRelays(relays: RelayConfig[]): void {
    for (const relay of relays) {
      this.addRelay(relay);
    }
  }

  /**
   * Add a new relay configuration
   */
  public addRelay(config: RelayConfig): void {
    this.relayConfigs.set(config.url, config);
    this.relayStatuses.set(config.url, {
      url: config.url,
      connected: false,
      retryCount: 0,
    });

    // Dispatch event for UI updates
    this.dispatchRelayUpdate(config.url);
  }

  /**
   * Remove relay configuration
   */
  public removeRelay(url: string): void {
    this.relayConfigs.delete(url);
    this.relayStatuses.delete(url);

    // Clear any pending reconnection timer
    const timer = this.reconnectTimers.get(url);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(url);
    }

    this.dispatchRelayUpdate(url);
  }

  /**
   * Update relay connection status
   */
  public updateRelayStatus(url: string, status: Partial<RelayStatus>): void {
    const currentStatus = this.relayStatuses.get(url);
    if (!currentStatus) return;

    const newStatus: RelayStatus = {
      ...currentStatus,
      ...status,
    };

    this.relayStatuses.set(url, newStatus);
    this.dispatchRelayUpdate(url);

    // Handle connection state changes
    if (status.connected !== undefined) {
      if (status.connected) {
        this.handleRelayConnected(url);
      } else {
        this.handleRelayDisconnected(url, status.error);
      }
    }
  }

  /**
   * Get relay configuration by URL
   */
  public getRelayConfig(url: string): RelayConfig | undefined {
    return this.relayConfigs.get(url);
  }

  /**
   * Get relay status by URL
   */
  public getRelayStatus(url: string): RelayStatus | undefined {
    return this.relayStatuses.get(url);
  }

  /**
   * Get all relay statuses
   */
  public getAllRelayStatuses(): RelayStatus[] {
    return Array.from(this.relayStatuses.values());
  }

  /**
   * Get healthy read relays sorted by priority
   */
  public getHealthyReadRelays(): string[] {
    const healthyRelays: Array<{ url: string; priority: number }> = [];

    for (const [url, config] of this.relayConfigs) {
      const status = this.relayStatuses.get(url);
      if (config.read && status?.connected) {
        healthyRelays.push({ url, priority: config.priority });
      }
    }

    return healthyRelays
      .sort((a, b) => a.priority - b.priority)
      .map(relay => relay.url);
  }

  /**
   * Get healthy write relays sorted by priority
   */
  public getHealthyWriteRelays(): string[] {
    const healthyRelays: Array<{ url: string; priority: number }> = [];

    for (const [url, config] of this.relayConfigs) {
      const status = this.relayStatuses.get(url);
      if (config.write && status?.connected) {
        healthyRelays.push({ url, priority: config.priority });
      }
    }

    return healthyRelays
      .sort((a, b) => a.priority - b.priority)
      .map(relay => relay.url);
  }

  /**
   * Handle successful relay connection
   */
  private handleRelayConnected(url: string): void {
    const status = this.relayStatuses.get(url);
    if (status) {
      status.retryCount = 0;
      status.lastConnected = Date.now();
    }

    // Clear any pending reconnection timer
    const timer = this.reconnectTimers.get(url);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(url);
    }

    console.info(`Relay connected: ${url}`);
  }

  /**
   * Handle relay disconnection
   */
  private handleRelayDisconnected(url: string, error?: string): void {
    const status = this.relayStatuses.get(url);
    const config = this.relayConfigs.get(url);

    if (!status || !config) return;

    console.warn(`Relay disconnected: ${url}`, error);

    // Update status
    status.error = error;

    // Schedule reconnection if within retry limits
    if (status.retryCount < config.maxRetries) {
      this.scheduleReconnection(url);
    } else {
      console.error(`Relay ${url} exceeded max retries (${config.maxRetries})`);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnection(url: string): void {
    const status = this.relayStatuses.get(url);
    const config = this.relayConfigs.get(url);

    if (!status || !config) return;

    status.retryCount++;

    // Calculate backoff delay
    const baseDelay = 1000; // 1 second
    const backoffDelay = Math.min(
      baseDelay * Math.pow(this.RECONNECT_BACKOFF_FACTOR, status.retryCount - 1),
      this.MAX_RECONNECT_DELAY
    );

    console.info(`Scheduling reconnection for ${url} in ${backoffDelay}ms (attempt ${status.retryCount})`);

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(url);
      this.attemptReconnection(url);
    }, backoffDelay);

    this.reconnectTimers.set(url, timer);
  }

  /**
   * Attempt to reconnect to a relay
   */
  private attemptReconnection(url: string): void {
    // Dispatch reconnection event for the Nostr client to handle
    window.dispatchEvent(
      new CustomEvent('relay:reconnect', {
        detail: { url },
      })
    );
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Perform health check on all relays
   */
  private performHealthCheck(): void {
    for (const url of this.relayConfigs.keys()) {
      const status = this.relayStatuses.get(url);
      if (status?.connected) {
        this.checkRelayLatency(url);
      }
    }
  }

  /**
   * Check relay latency
   */
  private async checkRelayLatency(url: string): Promise<void> {
    try {
      const start = performance.now();

      // Simple ping test using WebSocket connection
      // This is a basic implementation - in practice, you might want to
      // send a simple REQ/CLOSE to measure actual protocol latency
      const ws = new WebSocket(url);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Timeout'));
        }, 5000);

        ws.onopen = () => {
          const latency = performance.now() - start;
          this.updateRelayStatus(url, { latency });
          ws.close();
          clearTimeout(timeout);
          resolve();
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        };
      });
    } catch (error) {
      // Mark relay as potentially unhealthy
      console.warn(`Health check failed for ${url}:`, error);
    }
  }

  /**
   * Dispatch relay update event
   */
  private dispatchRelayUpdate(url: string): void {
    const status = this.relayStatuses.get(url);
    window.dispatchEvent(
      new CustomEvent('relay:status', {
        detail: { url, status },
      })
    );
  }

  /**
   * Get relay statistics
   */
  public getRelayStats(): {
    total: number;
    connected: number;
    disconnected: number;
    error: number;
  } {
    let connected = 0;
    let disconnected = 0;
    let error = 0;

    for (const status of this.relayStatuses.values()) {
      if (status.connected) {
        connected++;
      } else if (status.error) {
        error++;
      } else {
        disconnected++;
      }
    }

    return {
      total: this.relayStatuses.size,
      connected,
      disconnected,
      error,
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopHealthMonitoring();

    // Clear all reconnection timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Clear all data
    this.relayConfigs.clear();
    this.relayStatuses.clear();
  }
}