/**
 * Simple in-memory cache for NIM API responses
 * Reduces API calls by caching identical requests
 * TTL: 1 hour for most caches, 24 hours for embeddings
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class NimCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  
  // Cache TTLs
  private static readonly TTL = {
    SHORT: 15 * 60 * 1000,      // 15 minutes - chat completions
    MEDIUM: 60 * 60 * 1000,     // 1 hour - embeddings
    LONG: 24 * 60 * 60 * 1000,  // 24 hours - static data
  }

  private generateKey(...args: any[]): string {
    return JSON.stringify(args)
  }

  get<T>(...args: any[]): T | null {
    const key = this.generateKey(...args)
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  set<T>(data: T, ttl: number = NimCache.TTL.MEDIUM, ...args: any[]): void {
    const key = this.generateKey(...args)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  clear(): void {
    this.cache.clear()
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

export const nimCache = new NimCache()
