import { GameMetadata } from './MetadataFetcherService.js';

interface CachedMetadata {
  metadata: GameMetadata;
  timestamp: number;
}

/**
 * Cache for game metadata to avoid redundant API calls
 */
export class MetadataCache {
  private cache = new Map<string, CachedMetadata>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get cached metadata
   */
  get(key: string): GameMetadata | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.metadata;
  }

  /**
   * Set cached metadata
   */
  set(key: string, metadata: GameMetadata): void {
    this.cache.set(key, {
      metadata,
      timestamp: Date.now(),
    });
  }

  /**
   * Generate cache key from title and optional Steam App ID
   */
  generateKey(title: string, steamAppId?: string): string {
    if (steamAppId && steamAppId.match(/^\d+$/)) {
      return `steam-${steamAppId}`;
    }
    return `title-${this.normalizeTitle(title)}`;
  }

  /**
   * Normalize title for cache key
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-');
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
let metadataCacheInstance: MetadataCache | null = null;

export function getMetadataCache(): MetadataCache {
  if (!metadataCacheInstance) {
    metadataCacheInstance = new MetadataCache();
  }
  return metadataCacheInstance;
}
