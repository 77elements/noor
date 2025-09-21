# Performance Strategy & Optimization - Noornote Web Client

## Performance Philosophy: Speed as a Feature

### Core Performance Targets (Competitive Advantage)

**Bundle Size Goals:**
- **Total Bundle**: <500KB gzipped (vs competitors' 600-1200KB)
- **Initial Chunk**: <200KB gzipped
- **JavaScript**: <350KB gzipped
- **CSS**: <50KB gzipped
- **Images/Assets**: <100KB total

**Loading Performance:**
- **First Contentful Paint (FCP)**: <1.5s on 3G
- **Largest Contentful Paint (LCP)**: <2.5s on all connections
- **First Input Delay (FID)**: <100ms
- **Cumulative Layout Shift (CLS)**: <0.1
- **Time to Interactive (TTI)**: <3s on mobile

**Runtime Performance:**
- **Memory Usage**: <50MB for 1000+ timeline events
- **Timeline Scroll**: 60fps on mobile devices
- **Relay Connection**: <5s (Safari-optimized)
- **Search Response**: <100ms for client-side search
- **Real-time Updates**: <200ms latency

## Competitive Performance Analysis

### Benchmark Comparison (From Research):

| Client | Bundle Size | Initial Load | Memory Usage | Key Strength |
|--------|------------|-------------|--------------|--------------|
| **Jumble** | ~800KB | 2-3s | ~40MB | Client caching |
| **Primal** | ~600KB | 1-2s | ~30MB | Server caching |
| **YakiHonne** | ~1200KB | 3-5s | ~60MB | Long-form content |
| **Gleasonator** | ~900KB | 2-4s | ~45MB | Server rendering |
| **Noornote (Target)** | <500KB | <2s | <50MB | Vanilla JS |

### Key Performance Insights from Analysis:

**What Makes Nostr Clients Fast:**
1. **SimplePool Connection Pooling** (Jumble's secret)
2. **Multi-layer Caching** (Memory + IndexedDB + Service Worker)
3. **Event Batching & Deduplication** (Reduces relay requests)
4. **Client-side Search** (FlexSearch avoids server round-trips)
5. **Modern Build Tools** (Vite, tree-shaking, code splitting)

**What Makes Nostr Clients Slow:**
1. **Framework Overhead** (React Virtual DOM, component re-renders)
2. **Poor Caching Strategies** (Missing or inefficient)
3. **Bundle Bloat** (Unnecessary dependencies, poor code splitting)
4. **Safari WebSocket Issues** (Simultaneous connection problems)
5. **Memory Leaks** (Poor event listener cleanup)

## Bundle Optimization Strategy

### Tree Shaking & Dead Code Elimination:

```javascript
// Vite configuration for aggressive optimization
export default {
  build: {
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      },
      output: {
        manualChunks: {
          // Vendor chunk (nostr-tools, flexsearch)
          vendor: ['nostr-tools', 'flexsearch'],

          // UI chunk (components)
          ui: [
            './src/components/timeline',
            './src/components/profile',
            './src/components/compose'
          ],

          // Features chunk (lazy-loaded)
          features: [
            './src/features/search',
            './src/features/settings',
            './src/features/analytics'
          ]
        }
      }
    },

    // Terser optimization
    terserOptions: {
      compress: {
        drop_console: true,      // Remove console.log
        drop_debugger: true,     // Remove debugger statements
        pure_funcs: ['console.log', 'console.info'],
        dead_code: true,         // Remove unreachable code
        side_effects: false      // Enable more aggressive optimization
      },
      mangle: {
        properties: {
          regex: /^_/             // Mangle private properties
        }
      }
    }
  }
};
```

### Code Splitting Strategy:

```javascript
// Route-based code splitting
const routes = {
  '/': () => import('./views/TimelineView.js'),
  '/profile': () => import('./views/ProfileView.js'),
  '/settings': () => import('./views/SettingsView.js'),
  '/compose': () => import('./views/ComposeView.js')
};

// Feature-based code splitting
const features = {
  search: () => import('./features/AdvancedSearch.js'),
  analytics: () => import('./features/Analytics.js'),
  export: () => import('./features/DataExport.js')
};

// Preload critical routes
if (typeof requestIdleCallback !== 'undefined') {
  requestIdleCallback(() => {
    features.search(); // Preload search for better UX
  });
}
```

### Import Optimization:

```javascript
// ✅ Specific imports (tree-shakable)
import { getPublicKey } from 'nostr-tools/keys';
import { validateEvent } from 'nostr-tools/event';
import { SimplePool } from 'nostr-tools/pool';

// ❌ Avoid namespace imports
// import * as nostr from 'nostr-tools'; // Bundles entire library

// ✅ Conditional imports for polyfills
async function getWebCrypto() {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto;
  }

  // Polyfill only when needed
  const { webcrypto } = await import('crypto');
  return webcrypto;
}
```

## Runtime Performance Optimization

### Memory Management Strategy:

```javascript
// LRU Cache with size limits
class OptimizedCache {
  constructor(maxSize = 10000, maxMemory = 50 * 1024 * 1024) { // 50MB
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxMemory = maxMemory;
    this.currentMemory = 0;
  }

  set(key, value) {
    const size = this.calculateSize(value);

    // Evict if necessary
    while (this.currentMemory + size > this.maxMemory ||
           this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, { value, size, timestamp: Date.now() });
    this.currentMemory += size;
  }

  evictLRU() {
    const [oldestKey, oldestValue] = this.cache.entries().next().value;
    this.currentMemory -= oldestValue.size;
    this.cache.delete(oldestKey);
  }
}
```

### Virtual Scrolling Implementation:

```javascript
// High-performance virtual scrolling for large timelines
class VirtualScrollTimeline {
  constructor(container, itemHeight = 150) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.visibleRange = { start: 0, end: 0 };
    this.scrollTop = 0;
    this.items = [];

    this.setupIntersectionObserver();
    this.setupScrollListener();
  }

  render(items) {
    this.items = items;
    const containerHeight = this.container.clientHeight;
    const totalHeight = items.length * this.itemHeight;

    // Calculate visible range
    const start = Math.floor(this.scrollTop / this.itemHeight);
    const visibleCount = Math.ceil(containerHeight / this.itemHeight);
    const end = Math.min(start + visibleCount + 5, items.length); // +5 buffer

    this.visibleRange = { start, end };
    this.updateDOM(totalHeight);
  }

  updateDOM(totalHeight) {
    const fragment = document.createDocumentFragment();

    // Create spacer for total height
    const spacer = document.createElement('div');
    spacer.style.height = `${totalHeight}px`;
    spacer.style.position = 'relative';

    // Render only visible items
    for (let i = this.visibleRange.start; i < this.visibleRange.end; i++) {
      const item = this.createItemElement(this.items[i], i);
      item.style.position = 'absolute';
      item.style.top = `${i * this.itemHeight}px`;
      spacer.appendChild(item);
    }

    this.container.innerHTML = '';
    this.container.appendChild(spacer);
  }
}
```

### Event System Optimization:

```javascript
// Efficient event delegation with performance monitoring
class PerformantEventManager {
  constructor() {
    this.eventCache = new Map();
    this.throttledEvents = new Map();
  }

  // Throttled scroll handling
  onScroll(callback, delay = 16) { // 60fps = 16ms
    if (this.throttledEvents.has('scroll')) {
      return this.throttledEvents.get('scroll');
    }

    const throttled = this.throttle(callback, delay);
    this.throttledEvents.set('scroll', throttled);
    document.addEventListener('scroll', throttled, { passive: true });
    return throttled;
  }

  // Debounced input handling
  onInput(element, callback, delay = 300) {
    const debounced = this.debounce(callback, delay);
    element.addEventListener('input', debounced);
    return debounced;
  }

  throttle(func, delay) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(this, args);
      }
    };
  }

  debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
}
```

## Network & Relay Performance

### Optimized Relay Connection Management (Based on Jumble Analysis):

```javascript
// SimplePool optimization with Safari fixes
class OptimizedRelayManager {
  constructor() {
    this.pool = new SimplePool();
    this.connectionTimeouts = new Map();
    this.connectionQueue = [];
    this.maxConcurrentConnections = navigator.userAgent.includes('Safari') ? 3 : 8;
    this.retryDelays = [1000, 2000, 5000, 10000]; // Exponential backoff
  }

  async connectToRelay(url) {
    // Safari WebSocket optimization
    if (this.connectionQueue.length >= this.maxConcurrentConnections) {
      await this.waitForConnection();
    }

    const timeoutId = setTimeout(() => {
      this.pool.close([url]);
      this.connectionTimeouts.delete(url);
    }, 5000); // 5-second timeout

    this.connectionTimeouts.set(url, timeoutId);

    try {
      const relay = await this.pool.ensureRelay(url);
      clearTimeout(timeoutId);
      this.connectionTimeouts.delete(url);
      return relay;
    } catch (error) {
      this.handleConnectionError(url, error);
      throw error;
    }
  }

  // Event batching for efficiency
  async batchFetchEvents(filters, relays) {
    const batchSize = 50; // Optimal batch size from testing
    const results = [];

    for (let i = 0; i < filters.length; i += batchSize) {
      const batch = filters.slice(i, i + batchSize);
      const batchResults = await this.pool.list(relays, batch);
      results.push(...batchResults);

      // Yield control to prevent blocking
      if (i + batchSize < filters.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return this.deduplicateEvents(results);
  }

  deduplicateEvents(events) {
    const seen = new Set();
    return events.filter(event => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
  }
}
```

### Request Optimization:

```javascript
// DataLoader pattern for batching requests
class EventDataLoader {
  constructor(relayManager) {
    this.relayManager = relayManager;
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  async loadEvent(eventId) {
    // Check cache first
    if (this.cache.has(eventId)) {
      return this.cache.get(eventId);
    }

    // Check if request is already pending
    if (this.pendingRequests.has(eventId)) {
      return this.pendingRequests.get(eventId);
    }

    // Create new request
    const request = this.fetchEvent(eventId);
    this.pendingRequests.set(eventId, request);

    try {
      const result = await request;
      this.cache.set(eventId, result);
      return result;
    } finally {
      this.pendingRequests.delete(eventId);
    }
  }

  // Batch multiple event requests
  async loadEvents(eventIds) {
    const uncached = eventIds.filter(id => !this.cache.has(id));

    if (uncached.length === 0) {
      return eventIds.map(id => this.cache.get(id));
    }

    const batchResults = await this.relayManager.batchFetchEvents(
      uncached.map(id => ({ ids: [id] })),
      this.relayManager.readRelays
    );

    // Cache results
    batchResults.forEach(event => {
      this.cache.set(event.id, event);
    });

    return eventIds.map(id => this.cache.get(id)).filter(Boolean);
  }
}
```

## Search Performance (FlexSearch Integration)

### Optimized Search Implementation:

```javascript
// High-performance client-side search
class OptimizedNostrSearch {
  constructor() {
    this.index = new FlexSearch.Document({
      document: {
        id: 'id',
        index: [
          { field: 'content', tokenize: 'forward', resolution: 3 },
          { field: 'author', tokenize: 'strict' },
          { field: 'tags', tokenize: 'strict' }
        ],
        store: ['id', 'created_at', 'author', 'kind']
      },
      cache: 100,           // Cache 100 search results
      async: true,          // Non-blocking search
      worker: true          // Use Web Worker when available
    });

    this.searchCache = new Map();
    this.indexedEvents = new Set();
  }

  async addEvent(event) {
    if (this.indexedEvents.has(event.id)) return;

    const document = {
      id: event.id,
      content: event.content || '',
      author: event.pubkey,
      tags: event.tags.flat().join(' '),
      created_at: event.created_at,
      kind: event.kind
    };

    await this.index.add(document);
    this.indexedEvents.add(event.id);
  }

  async search(query, options = {}) {
    const cacheKey = `${query}-${JSON.stringify(options)}`;

    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    const results = await this.index.search(query, {
      limit: options.limit || 50,
      offset: options.offset || 0,
      ...options
    });

    this.searchCache.set(cacheKey, results);

    // Cache cleanup to prevent memory growth
    if (this.searchCache.size > 100) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }

    return results;
  }
}
```

## CSS Performance Optimizations

### Critical CSS Strategy:

```javascript
// Critical CSS extraction and inlining
class CriticalCSSOptimizer {
  constructor() {
    this.criticalSelectors = [
      '.app-layout',
      '.timeline-container',
      '.loading-state',
      '.error-boundary'
    ];
  }

  extractCriticalCSS() {
    const criticalCSS = [];

    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (this.isCritical(rule.selectorText)) {
            criticalCSS.push(rule.cssText);
          }
        }
      } catch (e) {
        // Handle CORS issues with external stylesheets
        console.warn('Cannot access stylesheet:', sheet.href);
      }
    }

    return criticalCSS.join('\n');
  }

  isCritical(selector) {
    return this.criticalSelectors.some(critical =>
      selector && selector.includes(critical)
    );
  }
}
```

### CSS Containment for Performance:

```css
/* Performance-optimized CSS containment */
.timeline-item {
  contain: layout style paint; /* Isolate layout calculations */
  will-change: transform;      /* Hint for GPU acceleration */
}

.virtual-scroll-container {
  contain: strict;             /* Maximum containment */
  overflow: hidden;
}

/* Layer promotion for smooth animations */
.timeline-item:hover {
  transform: translateZ(0);    /* Force GPU layer */
}
```

## Performance Monitoring & Metrics

### Real User Monitoring (RUM):

```javascript
// Privacy-respecting performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observations = [];
  }

  // Core Web Vitals tracking
  trackWebVitals() {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcp = entries[entries.length - 1];
      this.metrics.set('lcp', lcp.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.metrics.set('fid', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      let clsValue = 0;
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.metrics.set('cls', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  // Custom Nostr metrics
  trackNostrMetrics() {
    // Relay connection time
    this.trackTiming('relay-connection');

    // Event processing time
    this.trackTiming('event-processing');

    // Search performance
    this.trackTiming('search-query');
  }

  trackTiming(name) {
    return {
      start: () => performance.mark(`${name}-start`),
      end: () => {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);

        const measure = performance.getEntriesByName(name)[0];
        this.metrics.set(name, measure.duration);
      }
    };
  }
}
```

### Performance Budget Enforcement:

```javascript
// Bundle size monitoring
const performanceBudget = {
  javascript: 400 * 1024,      // 400KB
  css: 50 * 1024,              // 50KB
  images: 100 * 1024,          // 100KB
  total: 500 * 1024           // 500KB
};

// CI/CD integration for budget enforcement
class BudgetEnforcer {
  static validateBundle(stats) {
    const violations = [];

    if (stats.javascript > performanceBudget.javascript) {
      violations.push(`JavaScript bundle exceeds budget: ${stats.javascript} > ${performanceBudget.javascript}`);
    }

    if (stats.total > performanceBudget.total) {
      violations.push(`Total bundle exceeds budget: ${stats.total} > ${performanceBudget.total}`);
    }

    if (violations.length > 0) {
      throw new Error(`Performance budget violations:\n${violations.join('\n')}`);
    }
  }
}
```

---

*Performance strategy optimized for: Bundle Size < Runtime Performance < Memory Usage < Network Efficiency*