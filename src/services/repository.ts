import { getDatabaseService } from './database';
import crypto from 'crypto';

export interface SearchResult {
    id: number;
    query: string;
    queryHash: string;
    resultCount: number;
    scrapedAt: Date;
    lastAccessed: Date;
    accessCount: number;
    isPopular: boolean;
}

export interface Decision {
    id?: number;
    searchResultId?: number;
    siraNo: string;
    daire: string;
    esasNo: string;
    kararNo: string;
    kararTarihi: string;
    icerik: string;
    icerikLength?: number;
    positionInResults?: number;
    // Legacy support for fields that might be passed from scraper
    esas?: string;
    karar?: string;
    tarih?: string;
}

export interface ScrapingStat {
    query: string;
    success: boolean;
    durationMs: number;
    errorMessage?: string;
    source: 'memory' | 'database' | 'scrape';
    resultCount: number;
}

export interface PopularQuery {
    query: string;
    accessCount: number;
    resultCount: number;
    lastAccessed: Date;
    scrapedAt: Date;
    ageHours: number;
}

export class YargitayRepository {
    /**
     * Get database service instance
     */
    private get db() {
        return getDatabaseService();
    }

    /**
     * Generate MD5 hash for query
     */
    private generateQueryHash(query: string): string {
        const normalized = query.toLowerCase().trim();
        return crypto.createHash('md5').update(normalized).digest('hex');
    }

    /**
     * Find search result by query
     */
    async findByQuery(query: string): Promise<{ result: SearchResult; decisions: Decision[] } | null> {
        const queryHash = this.generateQueryHash(query);

        const resultQuery = `
      SELECT 
        id,
        query,
        query_hash as "queryHash",
        result_count as "resultCount",
        scraped_at as "scrapedAt",
        last_accessed as "lastAccessed",
        access_count as "accessCount",
        is_popular as "isPopular"
      FROM search_results
      WHERE query_hash = $1
    `;

        const resultData = await this.db.query<SearchResult>(resultQuery, [queryHash]);

        if (resultData.rows.length === 0) {
            return null;
        }

        const result = resultData.rows[0];

        // Get associated decisions
        const decisionsQuery = `
      SELECT 
        id,
        search_result_id as "searchResultId",
        sira_no as "siraNo",
        daire,
        esas_no as "esasNo",
        karar_no as "kararNo",
        karar_tarihi as "kararTarihi",
        icerik,
        icerik_length as "icerikLength",
        position_in_results as "positionInResults"
      FROM decisions 
      WHERE search_result_id = $1 
      ORDER BY position_in_results ASC
    `;

        const decisionsData = await this.db.query<Decision>(decisionsQuery, [result.id]);

        return {
            result,
            decisions: decisionsData.rows
        };
    }

    /**
     * Save search result with decisions
     */
    async saveSearchResult(query: string, decisions: Decision[]): Promise<number> {
        const queryHash = this.generateQueryHash(query);

        return await this.db.transaction(async (client) => {
            // Insert or update search result
            const insertResultQuery = `
        INSERT INTO search_results (query, query_hash, result_count)
        VALUES ($1, $2, $3)
        ON CONFLICT (query_hash) 
        DO UPDATE SET 
          result_count = EXCLUDED.result_count,
          scraped_at = CURRENT_TIMESTAMP,
          last_accessed = CURRENT_TIMESTAMP
        RETURNING id
      `;

            const resultData = await client.query(insertResultQuery, [
                query,
                queryHash,
                decisions.length
            ]);

            const searchResultId = resultData.rows[0].id;

            // Delete old decisions for this search
            await client.query('DELETE FROM decisions WHERE search_result_id = $1', [searchResultId]);

            // Insert new decisions
            if (decisions.length > 0) {
                const insertDecisionQuery = `
          INSERT INTO decisions (
            search_result_id, sira_no, daire, esas_no, karar_no, 
            karar_tarihi, icerik, icerik_length, position_in_results
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

                for (let i = 0; i < decisions.length; i++) {
                    const d = decisions[i];
                    await client.query(insertDecisionQuery, [
                        searchResultId,
                        d.siraNo,
                        d.daire,
                        d.esasNo || d.esas, // Fallback for alternative names
                        d.kararNo || d.karar,
                        d.kararTarihi || d.tarih,
                        d.icerik,
                        d.icerik?.length || 0,
                        i
                    ]);
                }
            }

            return searchResultId;
        });
    }

    /**
     * Update access count and last accessed time
     */
    async incrementAccessCount(query: string): Promise<void> {
        const queryHash = this.generateQueryHash(query);

        await this.db.query('SELECT update_search_access($1)', [queryHash]);
    }

    /**
     * Get popular queries
     */
    async getPopularQueries(limit: number = 20): Promise<PopularQuery[]> {
        const query = `
      SELECT * FROM popular_queries
      LIMIT $1
    `;

        const result = await this.db.query<PopularQuery>(query, [limit]);
        return result.rows;
    }

    /**
     * Track scraping statistics
     */
    async trackScraping(stat: ScrapingStat): Promise<void> {
        const query = `
      INSERT INTO scraping_stats (query, success, duration_ms, error_message, source, result_count)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

        await this.db.query(query, [
            stat.query,
            stat.success,
            stat.durationMs,
            stat.errorMessage || null,
            stat.source,
            stat.resultCount
        ]);
    }

    /**
     * Get search statistics for last N days
     */
    async getSearchStats(days: number = 7): Promise<any[]> {
        const query = `
      SELECT * FROM search_analytics
      WHERE date >= CURRENT_DATE - $1::INTEGER
      ORDER BY date DESC
    `;

        const result = await this.db.query(query, [days]);
        return result.rows;
    }

    /**
     * Get cache efficiency metrics
     */
    async getCacheEfficiency(hours: number = 24): Promise<any> {
        const query = `
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN source = 'memory' THEN 1 ELSE 0 END) as memory_hits,
        SUM(CASE WHEN source = 'database' THEN 1 ELSE 0 END) as database_hits,
        SUM(CASE WHEN source = 'scrape' THEN 1 ELSE 0 END) as scrapes,
        AVG(duration_ms) as avg_duration_ms,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed
      FROM scraping_stats
      WHERE scraped_at >= CURRENT_TIMESTAMP - ($1 || ' hours')::INTERVAL
    `;

        const result = await this.db.query(query, [hours]);
        const row = result.rows[0];

        return {
            totalRequests: parseInt(row.total_requests) || 0,
            memoryHits: parseInt(row.memory_hits) || 0,
            databaseHits: parseInt(row.database_hits) || 0,
            scrapes: parseInt(row.scrapes) || 0,
            avgDurationMs: parseFloat(row.avg_duration_ms) || 0,
            successful: parseInt(row.successful) || 0,
            failed: parseInt(row.failed) || 0,
            cacheHitRate: row.total_requests > 0
                ? Math.round(((parseInt(row.memory_hits) + parseInt(row.database_hits)) / parseInt(row.total_requests)) * 100)
                : 0
        };
    }

    /**
     * Cleanup old records
     */
    async cleanupOldRecords(daysToKeep: number = 90): Promise<number> {
        const result = await this.db.query('SELECT cleanup_old_records($1)', [daysToKeep]);
        return result.rows[0].cleanup_old_records;
    }

    /**
     * Check if query is stale (older than N days)
     */
    isStale(scrapedAt: Date, maxAgeDays: number = 30): boolean {
        const ageMs = Date.now() - new Date(scrapedAt).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        return ageDays > maxAgeDays;
    }
}

export const yargitayRepository = new YargitayRepository();
