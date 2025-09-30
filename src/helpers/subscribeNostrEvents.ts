/**
 * Universal Nostr Event Subscription Helper
 * Single-purpose, parametrized subscription for real-time events
 * NPM-ready: Can be published as @noornote/subscribe-nostr-events
 *
 * Eingabe: Filter parameters + relay URLs + callback
 * Verarbeitung: SimplePool.sub() with event handler
 * Ausgabe: Unsubscribe function
 *
 * Use-Cases:
 * 1. Subscribe to profile updates (kind 0)
 * 2. Subscribe to new timeline events (kinds [1, 6])
 * 3. Subscribe to replies (kind 1, e-tag)
 * 4. Subscribe to mentions (kind 1, p-tag)
 *
 * @example
 * // Profile updates
 * const unsub = subscribeNostrEvents({
 *   relays: ['wss://relay.damus.io'],
 *   authors: [pubkey],
 *   kinds: [0],
 *   onEvent: (event) => console.log('Profile updated:', event),
 *   autoCloseAfterMs: 10000
 * });
 *
 * @example
 * // New replies
 * const unsub = subscribeNostrEvents({
 *   relays: ['wss://relay.damus.io'],
 *   kinds: [1],
 *   referencedEventId: noteId,
 *   onEvent: (event) => console.log('New reply:', event)
 * });
 */

import { SimplePool } from 'nostr-tools/pool';
import type { Event as NostrEvent, Filter as NostrFilter, Sub } from 'nostr-tools';

export interface SubscribeNostrEventsParams {
  /** Relay URLs to subscribe to */
  relays: string[];

  /** Filter: Event IDs */
  ids?: string[];

  /** Filter: Author pubkeys */
  authors?: string[];

  /** Filter: Event kinds */
  kinds?: number[];

  /** Filter: Events older than this timestamp */
  until?: number;

  /** Filter: Events newer than this timestamp */
  since?: number;

  /** Filter: Limit number of events */
  limit?: number;

  /** Filter: Events that reference this event ID (e-tag) */
  referencedEventId?: string;

  /** Filter: Events that reference this pubkey (p-tag) */
  referencedPubkey?: string;

  /** Callback for each event received */
  onEvent: (event: NostrEvent) => void;

  /** Callback when EOSE (End Of Stored Events) is reached */
  onEose?: () => void;

  /** Use existing pool instance or create new one */
  pool?: SimplePool;

  /** Auto-close subscription after milliseconds (optional) */
  autoCloseAfterMs?: number;
}

/**
 * Subscribe to Nostr events from relays with flexible filtering
 * Returns unsubscribe function
 * Automatically handles EOSE and optional auto-close
 */
export function subscribeNostrEvents(
  params: SubscribeNostrEventsParams
): () => void {
  const {
    relays,
    ids,
    authors,
    kinds,
    until,
    since,
    limit,
    referencedEventId,
    referencedPubkey,
    onEvent,
    onEose,
    pool: externalPool,
    autoCloseAfterMs
  } = params;

  // Validate
  if (!relays || relays.length === 0) {
    throw new Error('subscribeNostrEvents: relays parameter is required and must not be empty');
  }

  if (!onEvent) {
    throw new Error('subscribeNostrEvents: onEvent callback is required');
  }

  // Use provided pool or create temporary one
  const pool = externalPool || new SimplePool();
  const shouldClosePool = !externalPool;

  // Construct Nostr filter
  const filter: NostrFilter = {};

  if (ids) filter.ids = ids;
  if (authors) filter.authors = authors;
  if (kinds) filter.kinds = kinds;
  if (until) filter.until = until;
  if (since) filter.since = since;
  if (limit) filter.limit = limit;

  // Referenced event (e-tag)
  if (referencedEventId) {
    filter['#e'] = [referencedEventId];
  }

  // Referenced pubkey (p-tag)
  if (referencedPubkey) {
    filter['#p'] = [referencedPubkey];
  }

  // Create subscription
  const sub = pool.sub(relays, [filter]);

  // Handle events
  sub.on('event', onEvent);

  // Handle EOSE
  if (onEose) {
    sub.on('eose', onEose);
  }

  // Auto-close timer
  let autoCloseTimer: number | undefined;
  if (autoCloseAfterMs !== undefined && autoCloseAfterMs > 0) {
    autoCloseTimer = window.setTimeout(() => {
      sub.unsub();
      if (shouldClosePool) {
        pool.close(relays);
      }
    }, autoCloseAfterMs);
  }

  // Return unsubscribe function
  return () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
    }
    sub.unsub();
    if (shouldClosePool) {
      pool.close(relays);
    }
  };
}