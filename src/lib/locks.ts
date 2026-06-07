/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Task 13: lightweight wrapper around the Web Locks API used to serialize
 * read-modify-write paths against IndexedDB (Chart of Accounts + journal
 * entries). Without serialization, two concurrent persists can clobber each
 * other: one reads the durable list, the other reads the same list, both
 * write — last-write-wins drops the loser's changes. The audit's Critical
 * #2 race manifested when account-mint and journal-import paths raced
 * against unrelated saveAll / supersedeImport / reload calls.
 *
 * Falls back to a process-local in-memory queue when navigator.locks is
 * unavailable (jsdom in tests, older Safari, non-browser environments).
 */

/** Per-lock-name in-memory queue used when navigator.locks is missing. */
const inMemoryQueues = new Map<string, Promise<unknown>>();

export async function withLock<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (
    typeof navigator !== 'undefined' &&
    typeof (navigator as Navigator).locks?.request === 'function'
  ) {
    return navigator.locks.request(name, async () => fn());
  }

  // Process-local fallback: chain onto the existing queue for this name so
  // concurrent callers wait their turn. Errors from one caller must NOT
  // poison the queue for the next — we always release with a resolved
  // sentinel and surface the original error via the returned promise.
  const prev = inMemoryQueues.get(name) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ticket = prev.then(() => next);
  inMemoryQueues.set(name, ticket);

  try {
    await prev.catch(() => undefined);
    return await fn();
  } finally {
    release();
    // Clean up the map entry once the chain is fully drained to avoid
    // unbounded growth across long-lived sessions.
    if (inMemoryQueues.get(name) === ticket) {
      inMemoryQueues.delete(name);
    }
  }
}
