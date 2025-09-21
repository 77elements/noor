# Software Architecture - Noornote Web Client

## Architectural Philosophy: Vanilla JS Enterprise Pattern

### Core Architecture Principles

**Modular Monolith Approach:**
- **Single Repository**: All code in one repo for simplicity
- **Clear Module Boundaries**: Strict separation between layers
- **Dependency Injection**: Loose coupling through DI patterns
- **Event-Driven Communication**: Components communicate via custom events
- **Immutable State**: Functional state updates with immutability

**No Framework Philosophy:**
- **Zero Runtime Dependencies**: Pure JavaScript with minimal build-time dependencies
- **Web Standards Compliance**: Built on standard web APIs
- **Progressive Enhancement**: Works without JavaScript
- **Future-Proof**: No framework lock-in or upgrade cycles

## System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Environment                       │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │   UI Layer    │  │  State Layer  │  │  Service Layer  │  │
│  │               │  │               │  │                 │  │
│  │ - Components  │  │ - Stores      │  │ - Nostr Client  │  │
│  │ - Views       │←→│ - Actions     │←→│ - Relay Manager │  │
│  │ - Events      │  │ - Selectors   │  │ - Cache Manager │  │
│  └───────────────┘  └───────────────┘  └─────────────────┘  │
│           ↑                   ↑                    ↓        │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ Helper Layer  │  │  Types Layer  │  │ External APIs   │  │
│  │               │  │               │  │                 │  │
│  │ - Utilities   │  │ - Interfaces  │  │ - Nostr Relays  │  │
│  │ - Formatters  │  │ - Models      │  │ - Media APIs    │  │
│  │ - Validators  │  │ - Enums       │  │ - Extension APIs│  │
│  └───────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Layer Architecture

#### 1. UI Layer (Presentation)
```
src/components/
├── common/           # Reusable UI components
│   ├── Button.js
│   ├── Modal.js
│   ├── Input.js
│   └── LoadingSpinner.js
├── timeline/         # Timeline-specific components
│   ├── TimelineView.js
│   ├── TimelineItem.js
│   └── TimelineFilters.js
├── compose/          # Note composition
│   ├── ComposeView.js
│   ├── ComposeEditor.js
│   └── ComposeActions.js
├── profile/          # User profile components
│   ├── ProfileView.js
│   ├── ProfileHeader.js
│   └── ProfilePosts.js
└── settings/         # Application settings
    ├── SettingsView.js
    ├── RelaySettings.js
    └── PrivacySettings.js
```

#### 2. State Layer (Data Management)
```
src/state/
├── stores/           # Individual state stores
│   ├── TimelineStore.js
│   ├── ProfileStore.js
│   ├── RelayStore.js
│   └── SettingsStore.js
├── actions/          # State modification actions
│   ├── TimelineActions.js
│   ├── ProfileActions.js
│   └── RelayActions.js
├── selectors/        # State selection helpers
│   ├── TimelineSelectors.js
│   └── ProfileSelectors.js
└── StateManager.js   # Core state management
```

#### 3. Service Layer (Business Logic)
```
src/services/
├── nostr/            # Nostr protocol handling
│   ├── NostrClient.js
│   ├── EventValidator.js
│   └── KeyManager.js
├── relay/            # Relay communication
│   ├── RelayManager.js
│   ├── RelayPool.js
│   └── RelayMonitor.js
├── cache/            # Caching strategies
│   ├── CacheManager.js
│   ├── IndexedDBCache.js
│   └── MemoryCache.js
└── search/           # Search functionality
    ├── SearchService.js
    ├── SearchIndex.js
    └── SearchFilters.js
```

#### 4. Helper Layer (Utilities)
```
src/helpers/
├── validation/       # Input validation
├── formatting/       # Content formatting
├── crypto/           # Cryptographic utilities
├── performance/      # Performance monitoring
└── browser/          # Browser API wrappers
```

## Component Architecture Pattern

### Base Component System

```javascript
// Universal component base class
class BaseComponent extends EventTarget {
  constructor(element, initialState = {}) {
    super();
    this.element = element;
    this.state = Object.freeze({ ...initialState });
    this.subscriptions = new Set();
    this.isDestroyed = false;

    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.render();
  }

  setState(newState) {
    if (this.isDestroyed) return;

    const prevState = this.state;
    this.state = Object.freeze({ ...this.state, ...newState });

    // Only re-render if state actually changed
    if (!this.shallowEqual(prevState, this.state)) {
      this.render();
      this.dispatchEvent(new CustomEvent('statechange', {
        detail: { prevState, newState: this.state }
      }));
    }
  }

  render() {
    // Override in subclasses
    throw new Error('render() must be implemented by subclasses');
  }

  setupEventListeners() {
    // Override in subclasses for event handling
  }

  subscribe(eventTarget, eventType, handler) {
    eventTarget.addEventListener(eventType, handler);
    this.subscriptions.add(() => {
      eventTarget.removeEventListener(eventType, handler);
    });
  }

  destroy() {
    this.isDestroyed = true;

    // Clean up all subscriptions
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();

    // Remove element from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.dispatchEvent(new CustomEvent('destroyed'));
  }

  shallowEqual(obj1, obj2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    return keys1.every(key => obj1[key] === obj2[key]);
  }
}
```

### Example Component Implementation

```javascript
// Timeline component example
class TimelineComponent extends BaseComponent {
  constructor(element) {
    super(element, {
      events: [],
      loading: false,
      error: null,
      selectedEvent: null
    });

    // Inject dependencies
    this.timelineStore = StateManager.getStore('timeline');
    this.relayService = ServiceContainer.get('relayService');
  }

  setupEventListeners() {
    // Subscribe to store changes
    this.subscribe(this.timelineStore, 'change', (event) => {
      this.setState({
        events: event.detail.events,
        loading: event.detail.loading,
        error: event.detail.error
      });
    });

    // Handle user interactions
    this.subscribe(this.element, 'click', this.handleClick.bind(this));
    this.subscribe(this.element, 'scroll', this.handleScroll.bind(this));
  }

  render() {
    if (this.state.loading) {
      this.renderLoading();
    } else if (this.state.error) {
      this.renderError();
    } else {
      this.renderEvents();
    }
  }

  renderEvents() {
    const timeline = this.element.querySelector('.timeline-content');
    timeline.innerHTML = '';

    this.state.events.forEach(event => {
      const eventElement = this.createEventElement(event);
      timeline.appendChild(eventElement);
    });
  }

  createEventElement(event) {
    const element = document.createElement('article');
    element.className = 'timeline-item';
    element.dataset.eventId = event.id;

    element.innerHTML = `
      <header class="timeline-item__header">
        <span class="author">${this.formatAuthor(event.pubkey)}</span>
        <time class="timestamp">${this.formatTimestamp(event.created_at)}</time>
      </header>
      <div class="timeline-item__content">
        ${this.formatContent(event.content)}
      </div>
    `;

    return element;
  }

  handleClick(event) {
    const timelineItem = event.target.closest('.timeline-item');
    if (timelineItem) {
      const eventId = timelineItem.dataset.eventId;
      this.selectEvent(eventId);
    }
  }

  selectEvent(eventId) {
    this.setState({ selectedEvent: eventId });

    this.dispatchEvent(new CustomEvent('eventselected', {
      detail: { eventId },
      bubbles: true
    }));
  }
}
```

## State Management Architecture

### Universal State Manager

```javascript
// Centralized state management without framework dependencies
class StateManager {
  constructor() {
    this.stores = new Map();
    this.middleware = [];
    this.devMode = process.env.NODE_ENV === 'development';
  }

  static getInstance() {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  createStore(name, initialState = {}, reducer = null) {
    const store = new Store(name, initialState, reducer);

    // Apply middleware
    this.middleware.forEach(middleware => {
      store.addMiddleware(middleware);
    });

    this.stores.set(name, store);
    return store;
  }

  getStore(name) {
    return this.stores.get(name);
  }

  addMiddleware(middleware) {
    this.middleware.push(middleware);

    // Apply to existing stores
    this.stores.forEach(store => {
      store.addMiddleware(middleware);
    });
  }

  // Global state debugging
  getDebugInfo() {
    if (!this.devMode) return null;

    const storeStates = {};
    this.stores.forEach((store, name) => {
      storeStates[name] = store.getState();
    });

    return {
      stores: storeStates,
      middleware: this.middleware.length,
      timestamp: Date.now()
    };
  }
}

// Individual store implementation
class Store extends EventTarget {
  constructor(name, initialState, reducer) {
    super();
    this.name = name;
    this.state = Object.freeze({ ...initialState });
    this.reducer = reducer || ((state, action) => state);
    this.middleware = [];
    this.history = []; // For time-travel debugging
  }

  getState() {
    return this.state;
  }

  dispatch(action) {
    const prevState = this.state;

    // Apply middleware
    let processedAction = action;
    this.middleware.forEach(middleware => {
      processedAction = middleware(this, processedAction, prevState);
    });

    // Apply reducer
    const newState = this.reducer(prevState, processedAction);

    if (newState !== prevState) {
      this.state = Object.freeze(newState);

      // Store history for debugging
      if (process.env.NODE_ENV === 'development') {
        this.history.push({
          action: processedAction,
          prevState,
          newState,
          timestamp: Date.now()
        });

        // Limit history size
        if (this.history.length > 50) {
          this.history.shift();
        }
      }

      this.dispatchEvent(new CustomEvent('change', {
        detail: {
          action: processedAction,
          prevState,
          newState,
          ...newState
        }
      }));
    }
  }

  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  // Subscribe to state changes
  subscribe(listener) {
    this.addEventListener('change', listener);
    return () => this.removeEventListener('change', listener);
  }
}
```

### Service Layer Architecture

```javascript
// Service Container for dependency injection
class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.factories = new Map();
  }

  static getInstance() {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  register(name, factory, singleton = true) {
    this.factories.set(name, { factory, singleton });
  }

  get(name) {
    // Return cached singleton
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    const serviceFactory = this.factories.get(name);
    if (!serviceFactory) {
      throw new Error(`Service '${name}' not registered`);
    }

    const service = serviceFactory.factory();

    if (serviceFactory.singleton) {
      this.services.set(name, service);
    }

    return service;
  }

  // Initialize all core services
  initializeCoreServices() {
    this.register('relayManager', () => new RelayManager());
    this.register('cacheManager', () => new CacheManager());
    this.register('searchService', () => new SearchService());
    this.register('nostrClient', () => new NostrClient());
  }
}
```

## Event-Driven Communication

### Custom Event System

```javascript
// Application-wide event bus
class EventBus extends EventTarget {
  constructor() {
    super();
    this.eventHistory = [];
    this.maxHistory = 100;
  }

  static getInstance() {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emit(eventType, data = null) {
    const event = new CustomEvent(eventType, {
      detail: data,
      timestamp: Date.now()
    });

    // Store for debugging
    this.eventHistory.push({
      type: eventType,
      data,
      timestamp: Date.now()
    });

    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    this.dispatchEvent(event);
  }

  on(eventType, listener) {
    this.addEventListener(eventType, listener);
    return () => this.removeEventListener(eventType, listener);
  }

  once(eventType, listener) {
    const wrapper = (event) => {
      listener(event);
      this.removeEventListener(eventType, wrapper);
    };
    this.addEventListener(eventType, wrapper);
  }

  // Get event history for debugging
  getEventHistory() {
    return this.eventHistory.slice();
  }
}

// Event types enumeration
const EventTypes = {
  // Timeline events
  TIMELINE_LOADED: 'timeline:loaded',
  TIMELINE_ERROR: 'timeline:error',
  EVENT_SELECTED: 'event:selected',

  // Relay events
  RELAY_CONNECTED: 'relay:connected',
  RELAY_DISCONNECTED: 'relay:disconnected',
  RELAY_ERROR: 'relay:error',

  // User events
  USER_SIGNED_IN: 'user:signed_in',
  USER_SIGNED_OUT: 'user:signed_out',

  // Navigation events
  ROUTE_CHANGED: 'route:changed',
  VIEW_CHANGED: 'view:changed'
};
```

## Error Handling Architecture

### Global Error Boundary

```javascript
// Comprehensive error handling system
class ErrorBoundary {
  constructor() {
    this.errorHandlers = new Map();
    this.errorHistory = [];
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('promise_rejection', event.reason, {
        promise: event.promise
      });
    });

    // Catch JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError('javascript_error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Catch resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError('resource_error', new Error('Resource failed to load'), {
          element: event.target,
          source: event.target.src || event.target.href
        });
      }
    }, true);
  }

  handleError(type, error, context = {}) {
    const errorInfo = {
      type,
      message: error.message || error,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Store error history
    this.errorHistory.push(errorInfo);
    if (this.errorHistory.length > 50) {
      this.errorHistory.shift();
    }

    // Find appropriate error handler
    const handler = this.errorHandlers.get(type) ||
                   this.errorHandlers.get('default');

    if (handler) {
      try {
        handler(errorInfo);
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError);
      }
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Application Error:', errorInfo);
    }

    // Emit error event for UI handling
    EventBus.getInstance().emit('error:occurred', errorInfo);
  }

  registerErrorHandler(type, handler) {
    this.errorHandlers.set(type, handler);
  }

  getErrorHistory() {
    return this.errorHistory.slice();
  }
}
```

## Module Loading & Code Splitting

### Dynamic Module Loading

```javascript
// Module loader for code splitting
class ModuleLoader {
  constructor() {
    this.loadedModules = new Map();
    this.loadingPromises = new Map();
  }

  async loadModule(moduleName) {
    // Return cached module
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    }

    // Return existing loading promise
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    // Create new loading promise
    const loadingPromise = this.importModule(moduleName);
    this.loadingPromises.set(moduleName, loadingPromise);

    try {
      const module = await loadingPromise;
      this.loadedModules.set(moduleName, module);
      this.loadingPromises.delete(moduleName);
      return module;
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }

  async importModule(moduleName) {
    const moduleMap = {
      'advanced-search': () => import('../features/AdvancedSearch.js'),
      'analytics': () => import('../features/Analytics.js'),
      'settings': () => import('../views/SettingsView.js'),
      'profile': () => import('../views/ProfileView.js')
    };

    const importFunction = moduleMap[moduleName];
    if (!importFunction) {
      throw new Error(`Module '${moduleName}' not found`);
    }

    return await importFunction();
  }

  // Preload modules for better performance
  preloadModules(moduleNames) {
    return Promise.allSettled(
      moduleNames.map(name => this.loadModule(name))
    );
  }
}
```

---

*Architecture optimized for: Modularity > Maintainability > Performance > Scalability*