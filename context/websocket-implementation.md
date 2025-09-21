# WebSocket Implementation Guide - Noornote Web Client

## Implementation Overview

Complete guide for implementing WebSocket optimization based on proven patterns, without requiring access to external repositories. All code patterns are based on web standards and nostr-tools documentation.

## Core Dependencies

### Required npm packages:
```json
{
  "nostr-tools": "^2.7.0",
  "fast-data-loader": "^2.2.0"
}
```

### Browser APIs Used:
- `WebSocket` (native browser API)
- `navigator.userAgent` (browser detection)
- `setTimeout/clearTimeout` (connection timeouts)
- `Promise/async-await` (async patterns)
- `Map/Set` (caching and deduplication)

## Safari WebSocket Optimization

### The Problem
Safari has performance issues when multiple WebSocket connections are opened simultaneously. This causes significant delays and can make the application unusable.

### The Solution
Implement connection pooling with browser-specific limits:

```javascript
// Safari WebSocket connection manager
class SafariOptimizedConnectionManager {
  constructor() {
    this.isSafari = this.detectSafari();
    this.maxConcurrentConnections = this.isSafari ? 3 : 8;
    this.activeConnections = new Set();
    this.connectionQueue = [];
    this.isProcessingQueue = false;
  }

  detectSafari() {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('safari') && !userAgent.includes('chrome');
  }

  async requestConnection(url) {
    return new Promise((resolve, reject) => {
      const request = { url, resolve, reject, timestamp: Date.now() };

      if (this.activeConnections.size < this.maxConcurrentConnections) {
        this.processConnectionRequest(request);
      } else {
        this.connectionQueue.push(request);
        this.processQueue();
      }
    });
  }

  async processConnectionRequest(request) {
    const { url, resolve, reject } = request;

    try {
      this.activeConnections.add(url);
      const connection = await this.createWebSocketConnection(url);

      // Setup cleanup on connection close
      connection.addEventListener('close', () => {
        this.activeConnections.delete(url);
        this.processQueue();
      });

      resolve(connection);
    } catch (error) {
      this.activeConnections.delete(url);
      this.processQueue();
      reject(error);
    }
  }

  async processQueue() {
    if (this.isProcessingQueue || this.connectionQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.connectionQueue.length > 0 &&
           this.activeConnections.size < this.maxConcurrentConnections) {
      const request = this.connectionQueue.shift();
      await this.processConnectionRequest(request);

      // Small delay to prevent overwhelming Safari
      if (this.isSafari) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.isProcessingQueue = false;
  }

  async createWebSocketConnection(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timeoutId = setTimeout(() => {
        ws.close();
        reject(new Error(`Connection timeout for ${url}`));
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        resolve(ws);
      };

      ws.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Connection failed for ${url}`));
      };
    });
  }
}
```

## SimplePool Integration

### nostr-tools SimplePool Usage
```javascript
import { SimplePool } from 'nostr-tools/pool';

class OptimizedRelayManager {
  constructor() {
    this.pool = new SimplePool();
    this.connectionManager = new SafariOptimizedConnectionManager();
    this.relayStatus = new Map();
    this.connectionTimeouts = new Map();
    this.reconnectDelays = [1000, 2000, 5000, 10000]; // ms
  }

  async connectToRelay(url) {
    // Validate URL
    if (!this.isValidRelayURL(url)) {
      throw new Error(`Invalid relay URL: ${url}`);
    }

    // Check if already connected
    if (this.relayStatus.get(url) === 'connected') {
      return this.pool.getRelay(url);
    }

    // Use Safari-optimized connection
    try {
      this.relayStatus.set(url, 'connecting');

      // Request connection through Safari optimizer
      await this.connectionManager.requestConnection(url);

      // Use SimplePool to establish Nostr connection
      const relay = await this.pool.ensureRelay(url);

      this.relayStatus.set(url, 'connected');
      this.setupRelayEventHandlers(relay, url);

      return relay;
    } catch (error) {
      this.relayStatus.set(url, 'error');
      this.handleConnectionError(url, error);
      throw error;
    }
  }

  setupRelayEventHandlers(relay, url) {
    // Handle relay disconnection
    relay.on('disconnect', () => {
      this.relayStatus.set(url, 'disconnected');
      this.scheduleReconnect(url);
    });

    // Handle relay errors
    relay.on('error', (error) => {
      console.warn(`Relay error for ${url}:`, error);
      this.relayStatus.set(url, 'error');
    });

    // Handle successful connection
    relay.on('connect', () => {
      this.relayStatus.set(url, 'connected');
      console.log(`Connected to relay: ${url}`);
    });
  }

  async scheduleReconnect(url, attempt = 0) {
    if (attempt >= this.reconnectDelays.length) {
      console.error(`Max reconnection attempts reached for ${url}`);
      return;
    }

    const delay = this.reconnectDelays[attempt];
    console.log(`Reconnecting to ${url} in ${delay}ms (attempt ${attempt + 1})`);

    setTimeout(async () => {
      try {
        await this.connectToRelay(url);
      } catch (error) {
        await this.scheduleReconnect(url, attempt + 1);
      }
    }, delay);
  }

  isValidRelayURL(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'wss:' || parsed.protocol === 'ws:';
    } catch {
      return false;
    }
  }

  handleConnectionError(url, error) {
    console.error(`Failed to connect to relay ${url}:`, error.message);
    // Could emit events for UI to handle
    // this.emit('relay-error', { url, error });
  }

  getConnectionStatus() {
    const status = {};
    for (const [url, state] of this.relayStatus) {
      status[url] = state;
    }
    return status;
  }
}
```

## DataLoader Pattern for Event Batching

### Request Batching Implementation
```javascript
class EventDataLoader {
  constructor(relayManager) {
    this.relayManager = relayManager;
    this.cache = new Map();
    this.pendingBatches = new Map();
    this.batchSize = 50;
    this.batchDelay = 16; // ~60fps for UI responsiveness
  }

  async loadEvent(eventId) {
    // Check cache first
    if (this.cache.has(eventId)) {
      return this.cache.get(eventId);
    }

    // Check if request is already pending
    if (this.pendingBatches.has(eventId)) {
      return this.pendingBatches.get(eventId);
    }

    // Create new batch request
    const batchPromise = this.createBatchRequest([eventId]);
    this.pendingBatches.set(eventId, batchPromise);

    try {
      const results = await batchPromise;
      const event = results.find(e => e.id === eventId);

      // Cache the result
      if (event) {
        this.cache.set(eventId, event);
      }

      return event;
    } finally {
      this.pendingBatches.delete(eventId);
    }
  }

  async loadEvents(eventIds) {
    const uncachedIds = eventIds.filter(id => !this.cache.has(id));

    if (uncachedIds.length === 0) {
      return eventIds.map(id => this.cache.get(id)).filter(Boolean);
    }

    // Split into batches
    const batches = this.createBatches(uncachedIds);
    const batchPromises = batches.map(batch => this.createBatchRequest(batch));

    const batchResults = await Promise.allSettled(batchPromises);
    const allEvents = [];

    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value);

        // Cache successful results
        result.value.forEach(event => {
          this.cache.set(event.id, event);
        });
      }
    });

    return eventIds.map(id =>
      allEvents.find(e => e.id === id) || this.cache.get(id)
    ).filter(Boolean);
  }

  createBatches(eventIds) {
    const batches = [];
    for (let i = 0; i < eventIds.length; i += this.batchSize) {
      batches.push(eventIds.slice(i, i + this.batchSize));
    }
    return batches;
  }

  async createBatchRequest(eventIds) {
    // Create filter for batch request
    const filter = {
      ids: eventIds,
      limit: eventIds.length
    };

    try {
      // Get connected relays
      const relays = this.relayManager.getConnectedRelays();

      if (relays.length === 0) {
        throw new Error('No connected relays available');
      }

      // Fetch from all relays and deduplicate
      const events = await this.relayManager.pool.list(relays, [filter]);
      return this.deduplicateEvents(events);

    } catch (error) {
      console.error('Batch request failed:', error);
      return [];
    }
  }

  deduplicateEvents(events) {
    const seen = new Set();
    return events.filter(event => {
      if (seen.has(event.id)) {
        return false;
      }
      seen.add(event.id);
      return true;
    });
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      pendingBatches: this.pendingBatches.size
    };
  }
}
```

## Performance Monitoring

### Connection Performance Tracking
```javascript
class RelayPerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.connectionTimes = new Map();
  }

  startConnectionTimer(url) {
    this.connectionTimes.set(url, performance.now());
  }

  recordConnectionSuccess(url) {
    const startTime = this.connectionTimes.get(url);
    if (startTime) {
      const connectionTime = performance.now() - startTime;
      this.recordMetric(url, 'connectionTime', connectionTime);
      this.connectionTimes.delete(url);
    }
  }

  recordConnectionFailure(url, error) {
    this.recordMetric(url, 'connectionFailures', 1);
    this.connectionTimes.delete(url);
    console.warn(`Connection failed for ${url}:`, error.message);
  }

  recordMetric(url, metricName, value) {
    if (!this.metrics.has(url)) {
      this.metrics.set(url, {
        connectionTime: [],
        connectionFailures: 0,
        eventsReceived: 0,
        bytesReceived: 0
      });
    }

    const relayMetrics = this.metrics.get(url);

    if (metricName === 'connectionTime') {
      relayMetrics.connectionTime.push(value);
      // Keep only last 10 measurements
      if (relayMetrics.connectionTime.length > 10) {
        relayMetrics.connectionTime.shift();
      }
    } else {
      relayMetrics[metricName] += value;
    }
  }

  getRelayStats(url) {
    const metrics = this.metrics.get(url);
    if (!metrics) return null;

    const avgConnectionTime = metrics.connectionTime.length > 0
      ? metrics.connectionTime.reduce((a, b) => a + b, 0) / metrics.connectionTime.length
      : 0;

    return {
      averageConnectionTime: Math.round(avgConnectionTime),
      connectionFailures: metrics.connectionFailures,
      eventsReceived: metrics.eventsReceived,
      bytesReceived: metrics.bytesReceived,
      reliability: this.calculateReliability(metrics)
    };
  }

  calculateReliability(metrics) {
    const totalAttempts = metrics.connectionTime.length + metrics.connectionFailures;
    if (totalAttempts === 0) return 0;

    const successRate = metrics.connectionTime.length / totalAttempts;
    return Math.round(successRate * 100);
  }

  getAllStats() {
    const stats = {};
    for (const [url, _] of this.metrics) {
      stats[url] = this.getRelayStats(url);
    }
    return stats;
  }
}
```

## Integration Example

### Complete Relay Manager Setup
```javascript
// Main relay manager that combines all optimizations
class ProductionRelayManager {
  constructor(relayUrls = []) {
    this.optimizedManager = new OptimizedRelayManager();
    this.dataLoader = new EventDataLoader(this.optimizedManager);
    this.performanceMonitor = new RelayPerformanceMonitor();
    this.relayUrls = relayUrls;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing relay connections...');

    // Connect to all configured relays
    const connectionPromises = this.relayUrls.map(url =>
      this.connectWithMonitoring(url)
    );

    const results = await Promise.allSettled(connectionPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;

    console.log(`Connected to ${successful}/${this.relayUrls.length} relays`);
    this.isInitialized = true;
  }

  async connectWithMonitoring(url) {
    this.performanceMonitor.startConnectionTimer(url);

    try {
      const relay = await this.optimizedManager.connectToRelay(url);
      this.performanceMonitor.recordConnectionSuccess(url);
      return relay;
    } catch (error) {
      this.performanceMonitor.recordConnectionFailure(url, error);
      throw error;
    }
  }

  async fetchEvents(filter) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Use batched loading for better performance
    if (filter.ids && filter.ids.length > 1) {
      return this.dataLoader.loadEvents(filter.ids);
    }

    // Use direct SimplePool for other queries
    const relays = this.optimizedManager.getConnectedRelays();
    return this.optimizedManager.pool.list(relays, [filter]);
  }

  getStatus() {
    return {
      connection: this.optimizedManager.getConnectionStatus(),
      performance: this.performanceMonitor.getAllStats(),
      cache: this.dataLoader.getCacheStats()
    };
  }

  shutdown() {
    this.optimizedManager.pool.close();
    this.dataLoader.clearCache();
  }
}

// Usage example
const relayManager = new ProductionRelayManager([
  'wss://relay.damus.io',
  'wss://nostr-pub.wellorder.net',
  'wss://relay.snort.social'
]);

await relayManager.initialize();

// Fetch events with optimized batching
const events = await relayManager.fetchEvents({
  kinds: [1],
  limit: 50
});
```

## Testing Strategy

### Unit Tests for WebSocket Optimization
```javascript
// Test Safari detection
describe('SafariOptimizedConnectionManager', () => {
  test('should detect Safari browser correctly', () => {
    // Mock user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      configurable: true
    });

    const manager = new SafariOptimizedConnectionManager();
    expect(manager.isSafari).toBe(true);
    expect(manager.maxConcurrentConnections).toBe(3);
  });

  test('should limit concurrent connections on Safari', async () => {
    const manager = new SafariOptimizedConnectionManager();
    manager.isSafari = true;
    manager.maxConcurrentConnections = 2;

    // Mock connection creation
    manager.createWebSocketConnection = jest.fn()
      .mockResolvedValue(new MockWebSocket());

    // Try to open 3 connections
    const promises = [
      manager.requestConnection('wss://relay1.com'),
      manager.requestConnection('wss://relay2.com'),
      manager.requestConnection('wss://relay3.com')
    ];

    await Promise.all(promises);

    // Should have queued the third connection
    expect(manager.activeConnections.size).toBeLessThanOrEqual(2);
  });
});
```

## Implementation Checklist

### Phase 1: Basic WebSocket Management
- [ ] Implement SafariOptimizedConnectionManager
- [ ] Add browser detection logic
- [ ] Implement connection queuing
- [ ] Add timeout handling

### Phase 2: SimplePool Integration
- [ ] Integrate with nostr-tools SimplePool
- [ ] Add relay status tracking
- [ ] Implement reconnection logic
- [ ] Add error handling

### Phase 3: Performance Optimization
- [ ] Implement DataLoader batching
- [ ] Add event deduplication
- [ ] Implement caching strategy
- [ ] Add performance monitoring

### Phase 4: Testing & Validation
- [ ] Unit tests for all components
- [ ] Cross-browser testing (especially Safari)
- [ ] Performance benchmarking
- [ ] Error scenario testing

---

*Implementation guide based on proven web standards and nostr-tools documentation*
*No external repository access required for implementation*