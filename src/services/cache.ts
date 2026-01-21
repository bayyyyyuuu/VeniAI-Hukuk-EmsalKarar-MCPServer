interface CacheItem<T> {
  data: T;
  expires: number;
  timestamp: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0
  };

  // TTL değerleri (milisaniye)
  private readonly TTL = {
    SEARCH_RESULTS: 5 * 60 * 1000,      // 5 dakika
    DECISION_DETAILS: 30 * 60 * 1000,  // 30 dakika
    ERROR_CACHE: 2 * 60 * 1000,        // 2 dakika
    POPULAR_QUERY: 24 * 60 * 60 * 1000 // 24 saat
  };

  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.TTL.SEARCH_RESULTS;
    const expires = Date.now() + ttl;
    
    this.cache.set(key, {
      data,
      expires,
      timestamp: Date.now()
    });

    this.updateStats();
    console.log(`>>> Cache SET: ${key} (TTL: ${ttlMs}ms)`);
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      this.updateStats();
      console.log(`>>> Cache MISS: ${key}`);
      return null;
    }

    // TTL kontrolü
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      console.log(`>>> Cache EXPIRED: ${key}`);
      return null;
    }

    this.stats.hits++;
    this.updateStats();
    console.log(`>>> Cache HIT: ${key}`);
    return item.data as T;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`>>> Cache DELETE: ${key}`);
      this.updateStats();
    }
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0
    };
    console.log(`>>> Cache CLEAR: ${size} item silindi`);
  }

  // Expire olmuş item'ları temizle
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`>>> Cache CLEANUP: ${cleaned} expired item silindi`);
      this.updateStats();
    }

    return cleaned;
  }

  // Cache key generator'ları
  generateSearchKey(query: string): string {
    return `search:${query.toLowerCase().trim()}`;
  }

  generateDetailKey(query: string, index: number): string {
    return `detail:${query.toLowerCase().trim()}:${index}`;
  }

  generateErrorKey(query: string): string {
    return `error:${query.toLowerCase().trim()}`;
  }

  // Popular queries için özel key
  generatePopularKey(query: string): string {
    return `popular:${query.toLowerCase().trim()}`;
  }

  // Stats güncelleme
  private updateStats(): void {
    this.stats.size = this.cache.size;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? Math.round((this.stats.hits / total) * 100) : 0;
  }

  // Cache bilgilerini al
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Cache içeriğini al (debug için)
  getCacheInfo(): Array<{ key: string; age: number; ttl: number }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      age: now - item.timestamp,
      ttl: item.expires - now
    }));
  }

  // Memory usage estimate
  getMemoryUsage(): number {
    // Basit hesaplama: her item için ortalama 1KB tahmini
    return this.cache.size * 1024;
  }

  // Periodic cleanup
  startPeriodicCleanup(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }
}

export const cacheService = new CacheService();
