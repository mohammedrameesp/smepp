// Simple client-side cache with expiration
export class Cache {
  private static readonly PREFIX = 'accreditation_cache_';

  static set<T>(key: string, data: T, expirationMinutes: number = 5): void {
    if (typeof window === 'undefined') return;

    const item = {
      data,
      expiry: Date.now() + expirationMinutes * 60 * 1000,
    };

    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(item));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  static get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const itemStr = localStorage.getItem(this.PREFIX + key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);

      // Check if expired
      if (Date.now() > item.expiry) {
        localStorage.removeItem(this.PREFIX + key);
        return null;
      }

      return item.data as T;
    } catch (error) {
      console.error('Failed to retrieve cached data:', error);
      return null;
    }
  }

  static remove(key: string): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.PREFIX + key);
    } catch (error) {
      console.error('Failed to remove cached data:', error);
    }
  }

  static clear(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}
