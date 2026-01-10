/**
 * Generic in-memory cache with TTL support.
 * Use for caching API responses, computed values, etc.
 *
 * @example
 * const cache = new MemoryCache<User>();
 * cache.set('user-123', userData, 5 * 60 * 1000); // 5 min TTL
 * const user = cache.get('user-123');
 */
export class MemoryCache<T> {
  private cache = new Map<string, { data: T; expiry: number }>();
  private defaultTtl: number;

  constructor(defaultTtlMs: number = 5 * 60 * 1000) {
    this.defaultTtl = defaultTtlMs;
  }

  /**
   * Get a cached value if it exists and hasn't expired
   */
  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set a value in the cache with optional TTL override
   */
  set(key: string, data: T, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs ?? this.defaultTtl);
    this.cache.set(key, { data, expiry });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (including expired entries)
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Remove all expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, value] of this.cache) {
      if (now > value.expiry) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get or set pattern - returns cached value or calls factory and caches result
   */
  async getOrSet(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached;

    const data = await factory();
    this.set(key, data, ttlMs);
    return data;
  }
}
