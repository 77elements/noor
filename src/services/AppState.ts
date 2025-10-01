/**
 * Central State Manager (Singleton)
 * Single source of truth for all application state
 * Uses subscription pattern for reactive updates
 */

import type { Event as NostrEvent } from 'nostr-tools';

export interface UserState {
  isAuthenticated: boolean;
  npub: string | null;
  pubkey: string | null;
  followingPubkeys: string[];
}

export interface TimelineState {
  events: NostrEvent[];
  hasMore: boolean;
  loading: boolean;
  includeReplies: boolean;
  lastLoadedTimestamp: number;
}

export interface ViewState {
  currentView: 'timeline' | 'single-note' | 'profile' | 'messages' | 'settings';
  currentNoteId?: string;
  currentProfileNpub?: string;
}

export interface AppStateData {
  user: UserState;
  timeline: TimelineState;
  view: ViewState;
}

type StateKey = keyof AppStateData;
type StateCallback<K extends StateKey> = (state: AppStateData[K]) => void;

export class AppState {
  private static instance: AppState;

  private state: AppStateData = {
    user: {
      isAuthenticated: false,
      npub: null,
      pubkey: null,
      followingPubkeys: []
    },
    timeline: {
      events: [],
      hasMore: true,
      loading: false,
      includeReplies: false,
      lastLoadedTimestamp: 0
    },
    view: {
      currentView: 'timeline'
    }
  };

  private subscribers: Map<StateKey, Set<StateCallback<any>>> = new Map();

  private constructor() {
    // Initialize subscriber maps
    this.subscribers.set('user', new Set());
    this.subscribers.set('timeline', new Set());
    this.subscribers.set('view', new Set());
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

  /**
   * Get current state (immutable)
   */
  public getState<K extends StateKey>(key: K): AppStateData[K] {
    return { ...this.state[key] } as AppStateData[K];
  }

  /**
   * Get entire state (immutable)
   */
  public getAllState(): AppStateData {
    return {
      user: { ...this.state.user },
      timeline: { ...this.state.timeline },
      view: { ...this.state.view }
    };
  }

  /**
   * Update state and notify subscribers
   */
  public setState<K extends StateKey>(key: K, updates: Partial<AppStateData[K]>): void {
    // Merge updates into existing state
    this.state[key] = {
      ...this.state[key],
      ...updates
    } as AppStateData[K];

    // Notify all subscribers for this state key
    this.notifySubscribers(key);

    console.log(`🔄 STATE: Updated ${key}`, this.state[key]);
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  public subscribe<K extends StateKey>(
    key: K,
    callback: StateCallback<K>
  ): () => void {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.add(callback);
    }

    // Immediately call with current state
    callback(this.getState(key));

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Notify all subscribers of a state change
   */
  private notifySubscribers<K extends StateKey>(key: K): void {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      const currentState = this.getState(key);
      callbacks.forEach(callback => callback(currentState));
    }
  }

  /**
   * Reset entire state (useful for logout)
   */
  public reset(): void {
    this.state = {
      user: {
        isAuthenticated: false,
        npub: null,
        pubkey: null,
        followingPubkeys: []
      },
      timeline: {
        events: [],
        hasMore: true,
        loading: false,
        includeReplies: false,
        lastLoadedTimestamp: 0
      },
      view: {
        currentView: 'timeline'
      }
    };

    // Notify all subscribers
    this.notifySubscribers('user');
    this.notifySubscribers('timeline');
    this.notifySubscribers('view');

    console.log('🔄 STATE: Reset to default');
  }

  /**
   * Debug: Log current state
   */
  public debug(): void {
    console.log('📊 CURRENT STATE:', this.getAllState());
  }
}
