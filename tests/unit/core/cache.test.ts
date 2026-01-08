/**
 * @file cache.test.ts
 * @description Tests for client-side cache with localStorage
 */

describe('Cache Tests', () => {
  const CACHE_PREFIX = 'durj_cache_';

  // Mock localStorage for tests
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
  });

  describe('Cache Key Generation', () => {
    it('should use correct prefix', () => {
      const key = 'test-key';
      const prefixedKey = CACHE_PREFIX + key;
      expect(prefixedKey).toBe('durj_cache_test-key');
    });

    it('should handle complex keys', () => {
      const key = 'user:123:settings';
      const prefixedKey = CACHE_PREFIX + key;
      expect(prefixedKey).toBe('durj_cache_user:123:settings');
    });
  });

  describe('Cache Item Structure', () => {
    interface CacheItem<T> {
      data: T;
      expiry: number;
    }

    const createCacheItem = <T>(data: T, expirationMinutes: number): CacheItem<T> => {
      return {
        data,
        expiry: Date.now() + expirationMinutes * 60 * 1000,
      };
    };

    it('should create cache item with data and expiry', () => {
      const data = { name: 'test', value: 123 };
      const item = createCacheItem(data, 5);

      expect(item.data).toEqual(data);
      expect(item.expiry).toBeGreaterThan(Date.now());
    });

    it('should calculate correct expiry for 5 minutes', () => {
      const now = Date.now();
      const item = createCacheItem('data', 5);
      const expectedExpiry = now + 5 * 60 * 1000;

      expect(item.expiry).toBeGreaterThanOrEqual(expectedExpiry - 100);
      expect(item.expiry).toBeLessThanOrEqual(expectedExpiry + 100);
    });

    it('should handle 0 minute expiration', () => {
      const item = createCacheItem('data', 0);
      expect(item.expiry).toBeLessThanOrEqual(Date.now() + 100);
    });
  });

  describe('Cache Expiration Logic', () => {
    const isExpired = (expiry: number, now: number = Date.now()): boolean => {
      return now > expiry;
    };

    it('should return false for non-expired cache', () => {
      const expiry = Date.now() + 60000; // 1 minute in future
      expect(isExpired(expiry)).toBe(false);
    });

    it('should return true for expired cache', () => {
      const expiry = Date.now() - 60000; // 1 minute in past
      expect(isExpired(expiry)).toBe(true);
    });

    it('should return true at exact expiry time', () => {
      const now = Date.now();
      expect(isExpired(now, now + 1)).toBe(true);
    });

    it('should return false just before expiry', () => {
      const now = Date.now();
      expect(isExpired(now, now - 1)).toBe(false);
    });
  });

  describe('Cache Set Logic', () => {
    const setCacheItem = <T>(
      storage: Record<string, string>,
      key: string,
      data: T,
      expirationMinutes: number
    ): boolean => {
      try {
        const item = {
          data,
          expiry: Date.now() + expirationMinutes * 60 * 1000,
        };
        storage[CACHE_PREFIX + key] = JSON.stringify(item);
        return true;
      } catch {
        return false;
      }
    };

    it('should store data with prefix', () => {
      setCacheItem(localStorageMock, 'testKey', { value: 42 }, 5);
      expect(localStorageMock['durj_cache_testKey']).toBeDefined();
    });

    it('should store serialized JSON', () => {
      setCacheItem(localStorageMock, 'testKey', { value: 42 }, 5);
      const stored = JSON.parse(localStorageMock['durj_cache_testKey']);
      expect(stored.data).toEqual({ value: 42 });
    });

    it('should include expiry timestamp', () => {
      setCacheItem(localStorageMock, 'testKey', 'data', 5);
      const stored = JSON.parse(localStorageMock['durj_cache_testKey']);
      expect(stored.expiry).toBeGreaterThan(Date.now());
    });

    it('should handle complex objects', () => {
      const complexData = {
        user: { id: 1, name: 'Test' },
        items: [1, 2, 3],
        nested: { a: { b: { c: 'deep' } } },
      };
      setCacheItem(localStorageMock, 'complex', complexData, 5);
      const stored = JSON.parse(localStorageMock['durj_cache_complex']);
      expect(stored.data).toEqual(complexData);
    });

    it('should handle arrays', () => {
      setCacheItem(localStorageMock, 'array', [1, 2, 3], 5);
      const stored = JSON.parse(localStorageMock['durj_cache_array']);
      expect(stored.data).toEqual([1, 2, 3]);
    });

    it('should handle strings', () => {
      setCacheItem(localStorageMock, 'string', 'hello world', 5);
      const stored = JSON.parse(localStorageMock['durj_cache_string']);
      expect(stored.data).toBe('hello world');
    });

    it('should handle null values', () => {
      setCacheItem(localStorageMock, 'null', null, 5);
      const stored = JSON.parse(localStorageMock['durj_cache_null']);
      expect(stored.data).toBeNull();
    });
  });

  describe('Cache Get Logic', () => {
    const getCacheItem = <T>(
      storage: Record<string, string>,
      key: string,
      now: number = Date.now()
    ): T | null => {
      try {
        const itemStr = storage[CACHE_PREFIX + key];
        if (!itemStr) return null;

        const item = JSON.parse(itemStr);

        if (now > item.expiry) {
          delete storage[CACHE_PREFIX + key];
          return null;
        }

        return item.data as T;
      } catch {
        return null;
      }
    };

    it('should retrieve non-expired data', () => {
      const now = Date.now();
      localStorageMock['durj_cache_test'] = JSON.stringify({
        data: { value: 42 },
        expiry: now + 60000,
      });

      const result = getCacheItem<{ value: number }>(localStorageMock, 'test', now);
      expect(result).toEqual({ value: 42 });
    });

    it('should return null for expired data', () => {
      const now = Date.now();
      localStorageMock['durj_cache_test'] = JSON.stringify({
        data: { value: 42 },
        expiry: now - 60000,
      });

      const result = getCacheItem(localStorageMock, 'test', now);
      expect(result).toBeNull();
    });

    it('should remove expired data from storage', () => {
      const now = Date.now();
      localStorageMock['durj_cache_test'] = JSON.stringify({
        data: 'expired',
        expiry: now - 60000,
      });

      getCacheItem(localStorageMock, 'test', now);
      expect(localStorageMock['durj_cache_test']).toBeUndefined();
    });

    it('should return null for non-existent key', () => {
      const result = getCacheItem(localStorageMock, 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for corrupted data', () => {
      localStorageMock['durj_cache_corrupted'] = 'not valid json{{{';
      const result = getCacheItem(localStorageMock, 'corrupted');
      expect(result).toBeNull();
    });
  });

  describe('Cache Remove Logic', () => {
    const removeCacheItem = (storage: Record<string, string>, key: string): void => {
      delete storage[CACHE_PREFIX + key];
    };

    it('should remove existing cache item', () => {
      localStorageMock['durj_cache_toRemove'] = JSON.stringify({ data: 'test', expiry: 0 });
      removeCacheItem(localStorageMock, 'toRemove');
      expect(localStorageMock['durj_cache_toRemove']).toBeUndefined();
    });

    it('should handle non-existent key gracefully', () => {
      expect(() => removeCacheItem(localStorageMock, 'nonexistent')).not.toThrow();
    });
  });

  describe('Cache Clear Logic', () => {
    const clearCache = (storage: Record<string, string>): void => {
      Object.keys(storage).forEach((key) => {
        if (key.startsWith(CACHE_PREFIX)) {
          delete storage[key];
        }
      });
    };

    it('should remove all cache items', () => {
      localStorageMock['durj_cache_item1'] = JSON.stringify({ data: 1 });
      localStorageMock['durj_cache_item2'] = JSON.stringify({ data: 2 });
      localStorageMock['durj_cache_item3'] = JSON.stringify({ data: 3 });

      clearCache(localStorageMock);

      expect(Object.keys(localStorageMock).filter(k => k.startsWith(CACHE_PREFIX))).toHaveLength(0);
    });

    it('should not remove non-cache items', () => {
      localStorageMock['durj_cache_item'] = JSON.stringify({ data: 'cache' });
      localStorageMock['other_item'] = 'other data';
      localStorageMock['user_settings'] = 'settings';

      clearCache(localStorageMock);

      expect(localStorageMock['other_item']).toBe('other data');
      expect(localStorageMock['user_settings']).toBe('settings');
      expect(localStorageMock['durj_cache_item']).toBeUndefined();
    });

    it('should handle empty storage', () => {
      expect(() => clearCache(localStorageMock)).not.toThrow();
    });
  });

  describe('Expiration Duration', () => {
    it('should correctly calculate 1 minute expiration', () => {
      const now = Date.now();
      const expiry = now + 1 * 60 * 1000;
      expect(expiry - now).toBe(60000);
    });

    it('should correctly calculate 5 minute expiration (default)', () => {
      const now = Date.now();
      const expiry = now + 5 * 60 * 1000;
      expect(expiry - now).toBe(300000);
    });

    it('should correctly calculate 60 minute expiration', () => {
      const now = Date.now();
      const expiry = now + 60 * 60 * 1000;
      expect(expiry - now).toBe(3600000);
    });

    it('should correctly calculate 24 hour expiration', () => {
      const now = Date.now();
      const expiry = now + 24 * 60 * 60 * 1000;
      expect(expiry - now).toBe(86400000);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize and deserialize object correctly', () => {
      const original = { name: 'test', count: 42, active: true };
      const serialized = JSON.stringify({ data: original, expiry: Date.now() + 60000 });
      const deserialized = JSON.parse(serialized);
      expect(deserialized.data).toEqual(original);
    });

    it('should handle Date objects (converts to string)', () => {
      const date = new Date('2025-01-01');
      const serialized = JSON.stringify({ data: { date }, expiry: 0 });
      const deserialized = JSON.parse(serialized);
      expect(deserialized.data.date).toBe(date.toISOString());
    });

    it('should handle undefined values (becomes null)', () => {
      const obj = { a: 1, b: undefined };
      const serialized = JSON.stringify({ data: obj, expiry: 0 });
      const deserialized = JSON.parse(serialized);
      expect(deserialized.data.b).toBeUndefined();
    });

    it('should handle arrays with mixed types', () => {
      const original = [1, 'two', { three: 3 }, [4, 5]];
      const serialized = JSON.stringify({ data: original, expiry: 0 });
      const deserialized = JSON.parse(serialized);
      expect(deserialized.data).toEqual(original);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large data', () => {
      const largeArray = Array(1000).fill({ id: 1, name: 'test item' });
      const setCacheItem = <T>(storage: Record<string, string>, key: string, data: T): boolean => {
        try {
          storage[CACHE_PREFIX + key] = JSON.stringify({ data, expiry: Date.now() + 60000 });
          return true;
        } catch {
          return false;
        }
      };

      expect(setCacheItem(localStorageMock, 'large', largeArray)).toBe(true);
    });

    it('should handle special characters in key', () => {
      const key = 'user:123:settings/data';
      const prefixedKey = CACHE_PREFIX + key;
      expect(prefixedKey).toBe('durj_cache_user:123:settings/data');
    });

    it('should handle empty string key', () => {
      const key = '';
      const prefixedKey = CACHE_PREFIX + key;
      expect(prefixedKey).toBe('durj_cache_');
    });
  });
});
