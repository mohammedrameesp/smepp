import { MemoryCache } from '@/lib/core/caching';

describe('MemoryCache', () => {
  it('should store and retrieve values', () => {
    const cache = new MemoryCache<string>();
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('should return null for non-existent keys', () => {
    const cache = new MemoryCache<string>();
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should return null for expired values', async () => {
    const cache = new MemoryCache<string>(50); // 50ms TTL
    cache.set('key', 'value');
    await new Promise((r) => setTimeout(r, 100));
    expect(cache.get('key')).toBeNull();
  });

  it('should support custom TTL per entry', async () => {
    const cache = new MemoryCache<string>(1000); // 1s default TTL
    cache.set('short', 'value', 50); // 50ms TTL
    cache.set('long', 'value', 500); // 500ms TTL

    await new Promise((r) => setTimeout(r, 100));

    expect(cache.get('short')).toBeNull();
    expect(cache.get('long')).toBe('value');
  });

  it('should check if key exists with has()', () => {
    const cache = new MemoryCache<string>();
    cache.set('key', 'value');

    expect(cache.has('key')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should delete keys', () => {
    const cache = new MemoryCache<string>();
    cache.set('key', 'value');

    expect(cache.delete('key')).toBe(true);
    expect(cache.get('key')).toBeNull();
    expect(cache.delete('nonexistent')).toBe(false);
  });

  it('should clear all entries', () => {
    const cache = new MemoryCache<string>();
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    cache.clear();

    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
    expect(cache.size).toBe(0);
  });

  it('should report size', () => {
    const cache = new MemoryCache<string>();
    expect(cache.size).toBe(0);

    cache.set('key1', 'value1');
    expect(cache.size).toBe(1);

    cache.set('key2', 'value2');
    expect(cache.size).toBe(2);
  });

  it('should prune expired entries', async () => {
    const cache = new MemoryCache<string>(50); // 50ms TTL
    cache.set('expired1', 'value');
    cache.set('expired2', 'value');
    cache.set('valid', 'value', 1000); // 1s TTL

    await new Promise((r) => setTimeout(r, 100));

    const pruned = cache.prune();

    expect(pruned).toBe(2);
    expect(cache.size).toBe(1);
    expect(cache.get('valid')).toBe('value');
  });

  it('should support getOrSet pattern', async () => {
    const cache = new MemoryCache<number>();
    let callCount = 0;
    const factory = async () => {
      callCount++;
      return 42;
    };

    const result1 = await cache.getOrSet('key', factory);
    const result2 = await cache.getOrSet('key', factory);

    expect(result1).toBe(42);
    expect(result2).toBe(42);
    expect(callCount).toBe(1); // Factory only called once
  });

  it('should call factory again after expiry in getOrSet', async () => {
    const cache = new MemoryCache<number>(50); // 50ms TTL
    let callCount = 0;
    const factory = async () => {
      callCount++;
      return callCount;
    };

    const result1 = await cache.getOrSet('key', factory);
    await new Promise((r) => setTimeout(r, 100));
    const result2 = await cache.getOrSet('key', factory);

    expect(result1).toBe(1);
    expect(result2).toBe(2);
    expect(callCount).toBe(2);
  });

  it('should work with complex objects', () => {
    interface User {
      id: string;
      name: string;
      roles: string[];
    }

    const cache = new MemoryCache<User>();
    const user: User = { id: '123', name: 'John', roles: ['admin', 'user'] };

    cache.set('user-123', user);
    const retrieved = cache.get('user-123');

    expect(retrieved).toEqual(user);
    expect(retrieved?.roles).toContain('admin');
  });

  it('should use default TTL of 5 minutes', () => {
    const cache = new MemoryCache<string>();
    const now = Date.now();

    // Mock Date.now to verify TTL
    const originalNow = Date.now;
    Date.now = () => now;

    cache.set('key', 'value');

    // Check that entry is valid at 4 minutes 59 seconds
    Date.now = () => now + 4 * 60 * 1000 + 59 * 1000;
    expect(cache.get('key')).toBe('value');

    // Check that entry is expired at 5 minutes 1 second
    Date.now = () => now + 5 * 60 * 1000 + 1000;
    expect(cache.get('key')).toBeNull();

    Date.now = originalNow;
  });
});
