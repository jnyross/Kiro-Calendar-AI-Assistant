import { config } from '../config';
import { logger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Simple in-memory cache implementation
 * Suitable for caching parsed commands and API responses
 */
export class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;

  constructor() {
    this.cache = new Map();
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    logger.debug(`Cache hit for key: ${key}`);
    return entry.data as T;
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const ttlMs = (ttl || config.cache.ttl) * 1000;
    
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttlMs
    });

    logger.debug(`Cached value for key: ${key} with TTL: ${ttlMs}ms`);
  }

  /**
   * Delete value from cache
   * @param key Cache key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.debug(`Cleaned up ${deletedCount} expired cache entries`);
    }
  }
}

// Export singleton instance
export const cache = new MemoryCache();