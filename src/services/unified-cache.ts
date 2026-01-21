import { cacheService as memoryCache } from './cache';
import { yargitayRepository, Decision } from './repository';
import { config } from '../config/config';

export interface CacheResult {
  source: 'memory' | 'database' | 'scrape';
  data: Decision[] | null;
  metadata?: {
    age?: number;
    accessCount?: number;
    isPopular?: boolean;
  };
}

/**
 * Unified 3-tier cache service
 * L1: Memory cache (ultra fast, 5 min TTL)
 * L2: Database cache (fast, 30 days TTL)
 * L3: Fresh scrape (slow, saves to DB)
 */
export class UnifiedCacheService {
  /**
   * Get data from cache hierarchy
   */
  async get(query: string): Promise<CacheResult> {
    const startTime = Date.now();

    // L1: Memory cache check
    const memoryKey = memoryCache.generateSearchKey(query);
    const memoryResult = memoryCache.get<Decision[]>(memoryKey);

    if (memoryResult) {
      console.log(`>>> L1 Cache HIT (memory): ${Date.now() - startTime}ms`);
      return {
        source: 'memory',
        data: memoryResult
      };
    }

    // L2: Database cache check
    try {
      const dbResult = await yargitayRepository.findByQuery(query);

      if (dbResult) {
        const isStale = yargitayRepository.isStale(
          dbResult.result.scrapedAt,
          config.cache.l2TtlDays
        );

        if (!isStale) {
          console.log(`>>> L2 Cache HIT (database): ${Date.now() - startTime}ms`);

          // Promote to L1 cache
          memoryCache.set(memoryKey, dbResult.decisions, config.cache.l1TtlMs);

          // Update access count (async, fire and forget)
          yargitayRepository.incrementAccessCount(query).catch(err =>
            console.error('Failed to increment access count:', err)
          );

          return {
            source: 'database',
            data: dbResult.decisions,
            metadata: {
              age: Date.now() - new Date(dbResult.result.scrapedAt).getTime(),
              accessCount: dbResult.result.accessCount,
              isPopular: dbResult.result.isPopular
            }
          };
        } else {
          console.log(`>>> L2 Cache STALE (age: ${Math.floor((Date.now() - new Date(dbResult.result.scrapedAt).getTime()) / (1000 * 60 * 60 * 24))} days)`);
        }
      }
    } catch (error) {
      console.error('>>> Database cache check failed:', error);
      // Fallback to scrape if DB fails
    }

    // L3: Cache miss - need fresh scrape
    console.log(`>>> Cache MISS - Fresh scrape needed`);
    return {
      source: 'scrape',
      data: null
    };
  }

  /**
   * Save data to all cache levels
   */
  async set(query: string, data: Decision[]): Promise<void> {
    // Save to L1 (memory)
    const memoryKey = memoryCache.generateSearchKey(query);
    memoryCache.set(memoryKey, data, config.cache.l1TtlMs);

    // Save to L2 (database)
    try {
      await yargitayRepository.saveSearchResult(query, data);
      console.log(`>>> Cached to L1 + L2: ${data.length} results`);
    } catch (error) {
      console.error('>>> Failed to save to L2 cache:', error);
    }
  }

  /**
   * Invalidate cache for a query
   */
  async invalidate(query: string): Promise<void> {
    const memoryKey = memoryCache.generateSearchKey(query);
    memoryCache.delete(memoryKey);

    // Note: We don't delete from DB immediately, just let it expire or be overwritten
    // If explicit delete is needed, we would add repository method
    console.log(`>>> Cache invalidated for query: ${query}`);
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const memoryStats = memoryCache.getStats();
    let dbEfficiency = null;

    try {
      dbEfficiency = await yargitayRepository.getCacheEfficiency(24);
    } catch (error) {
      console.error('Failed to get DB stats:', error);
      dbEfficiency = { error: 'Database unavailable' };
    }

    return {
      memory: memoryStats,
      database: dbEfficiency,
      combined: {
        totalHitRate: dbEfficiency?.cacheHitRate || 0,
        avgResponseTime: dbEfficiency?.avgDurationMs || 0
      }
    };
  }

  /**
   * Cleanup old cache entries
   */
  async cleanup(): Promise<{ memory: number; database: number }> {
    const memoryCleanup = memoryCache.cleanup();
    let dbCleanup = 0;

    try {
      dbCleanup = await yargitayRepository.cleanupOldRecords(config.cache.l2TtlDays);
    } catch (error) {
      console.error('Failed to cleanup DB:', error);
    }

    console.log(`>>> Cleanup: ${memoryCleanup} memory items, ${dbCleanup} database records`);

    return {
      memory: memoryCleanup,
      database: dbCleanup
    };
  }
}

export const unifiedCache = new UnifiedCacheService();
