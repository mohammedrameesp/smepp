/**
 * Request Deduplication Utility
 *
 * Prevents duplicate API requests from being processed simultaneously.
 * Useful for preventing double-submissions from impatient users clicking multiple times.
 */

const pendingRequests = new Map<string, Promise<any>>();

/**
 * Deduplicate a request by key
 *
 * If the same key is requested multiple times within the TTL,
 * all callers will receive the same promise result.
 *
 * @param key - Unique identifier for the request
 * @param fn - Function to execute (only once per key)
 * @param ttlMs - Time to live in milliseconds (default: 1000ms)
 */
export async function dedupRequest<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = 1000
): Promise<T> {
  // Check if request is already in flight
  if (pendingRequests.has(key)) {
    console.log(`[DEDUP] Reusing pending request: ${key}`);
    return pendingRequests.get(key)!;
  }

  console.log(`[DEDUP] Executing new request: ${key}`);

  // Execute and cache promise
  const promise = fn().finally(() => {
    // Auto-clean after completion + TTL
    setTimeout(() => {
      if (pendingRequests.get(key) === promise) {
        pendingRequests.delete(key);
      }
    }, ttlMs);
  });

  pendingRequests.set(key, promise);

  return promise;
}

/**
 * Clear a specific deduplication key manually
 */
export function clearDedupKey(key: string): void {
  pendingRequests.delete(key);
}

/**
 * Clear all deduplication keys
 */
export function clearAllDedupKeys(): void {
  pendingRequests.clear();
}

/**
 * Get current number of pending requests
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}
