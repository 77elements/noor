/**
 * Universal Nostr Event Fetch Helper
 * Single-purpose, parametrized fetch that covers all use-cases
 * NPM-ready: Can be published as @noornote/fetch-nostr-events
 *
 * Eingabe: Filter parameters + relay URLs
 * Verarbeitung: SimplePool.list() with constructed filter
 * Ausgabe: Array of NostrEvent objects
 *
 * Use-Cases:
 * 1. Timeline (many authors, time window, kinds [1,6])
 * 2. Single event by ID (ids: [eventId], limit: 1)
 * 3. User profile (authors: [pubkey], kinds: [0], limit: 1)
 * 4. Following list (authors: [pubkey], kinds: [3], limit: 1)
 * 5. Replies to event (kinds: [1], referencedEventId)
 * 6. Load more (same as timeline but with until)
 *
 * @example
 * // Timeline
 * const events = await fetchNostrEvents({
 *   relays: ['wss://relay.damus.io'],
 *   authors: [pubkey1, pubkey2],
 *   kinds: [1, 6],
 *   timeWindowHours: 1
 * });
 *
 * @example
 * // Single event
 * const event = await fetchNostrEvents({
 *   relays: ['wss://relay.damus.io'],
 *   ids: [eventId],
 *   limit: 1
 * });
 *
 * @example
 * // Replies
 * const replies = await fetchNostrEvents({
 *   relays: ['wss://relay.damus.io'],
 *   kinds: [1],
 *   referencedEventId: parentEventId
 * });
 */

import { SimplePool } from 'nostr-tools/pool';
import type { Event as NostrEvent, Filter as NostrFilter } from 'nostr-tools';

export interface FetchNostrEventsParams {
  /** Relay URLs to fetch from */
  relays: string[];

  /** Filter: Event IDs (for fetching specific events) */
  ids?: string[];

  /** Filter: Author pubkeys */
  authors?: string[];

  /** Filter: Event kinds (1=text note, 3=contacts, 6=repost, 0=metadata) */
  kinds?: number[];

  /** Filter: Fetch events older than this timestamp */
  until?: number;

  /** Filter: Fetch events newer than this timestamp */
  since?: number;

  /** Filter: Limit number of events */
  limit?: number;

  /** Filter: Events that reference this event ID (e-tag) */
  referencedEventId?: string;

  /** Filter: Events that reference this pubkey (p-tag) */
  referencedPubkey?: string;

  /** Convenience: Time window in hours (automatically calculates since) */
  timeWindowHours?: number;

  /** Use existing pool instance or create new one */
  pool?: SimplePool;

  /** Timeout in milliseconds (default: 5000) */
  timeout?: number;
}

export interface FetchNostrEventsResult {
  /** Fetched events (deduplicated by ID) */
  events: NostrEvent[];

  /** Number of relays that responded */
  relaysResponded: number;

  /** Relay URLs that failed to respond */
  failedRelays: string[];
}

/**
 * Fetch Nostr events from relays with flexible filtering
 * All parameters optional except relays
 * Automatically deduplicates events by ID
 */
export async function fetchNostrEvents(
  params: FetchNostrEventsParams
): Promise<FetchNostrEventsResult> {
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
    timeWindowHours,
    pool: externalPool,
    timeout = 5000
  } = params;

  // Validate
  if (!relays || relays.length === 0) {
    throw new Error('fetchNostrEvents: relays parameter is required and must not be empty');
  }

  // Use provided pool or create temporary one
  const pool = externalPool || new SimplePool();
  const shouldClosePool = !externalPool;

  try {
    // Construct Nostr filter
    const filter: NostrFilter = {};

    if (ids) filter.ids = ids;
    if (authors) filter.authors = authors;
    if (kinds) filter.kinds = kinds;
    if (until) filter.until = until;
    if (limit) filter.limit = limit;

    // Time window convenience: calculate since from until or now
    if (timeWindowHours !== undefined) {
      const timeWindowSeconds = timeWindowHours * 3600;
      const referenceTime = until || Math.floor(Date.now() / 1000);
      filter.since = referenceTime - timeWindowSeconds;
    } else if (since !== undefined) {
      filter.since = since;
    }

    // Referenced event (e-tag) - for replies/quotes
    if (referencedEventId) {
      filter['#e'] = [referencedEventId];
    }

    // Referenced pubkey (p-tag) - for mentions
    if (referencedPubkey) {
      filter['#p'] = [referencedPubkey];
    }

    // Fetch with timeout
    const events = await Promise.race([
      pool.list(relays, [filter]),
      new Promise<NostrEvent[]>((_, reject) =>
        setTimeout(() => reject(new Error('Fetch timeout')), timeout)
      )
    ]);

    // Deduplicate by event ID
    const uniqueEvents = new Map<string, NostrEvent>();
    events.forEach(event => {
      if (!uniqueEvents.has(event.id)) {
        uniqueEvents.set(event.id, event);
      }
    });

    // Sort by created_at (newest first)
    const sortedEvents = Array.from(uniqueEvents.values());
    sortedEvents.sort((a, b) => b.created_at - a.created_at);

    return {
      events: sortedEvents,
      relaysResponded: relays.length, // Note: SimplePool doesn't expose per-relay success
      failedRelays: []
    };

  } catch (error) {
    console.error('fetchNostrEvents error:', error);
    return {
      events: [],
      relaysResponded: 0,
      failedRelays: relays
    };
  } finally {
    // Clean up temporary pool
    if (shouldClosePool) {
      pool.close(relays);
    }
  }
}