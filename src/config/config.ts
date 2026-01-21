export interface DatabaseConfig {
    type: 'postgresql' | 'sqlite';
    url: string;
    pool: {
        min: number;
        max: number;
    };
}

export interface ScrapingConfig {
    maxResults: number;
    parallelRequests: number;
    adaptiveTimeout: boolean;
    retryStrategy: 'exponential' | 'linear' | 'fixed';
    baseTimeout: number;
}

export interface CacheConfig {
    l1TtlMs: number;
    l2TtlDays: number;
    popularThreshold: number;
    cleanupIntervalMs: number;
}

export interface BrowserlessConfig {
    url: string;
    token: string;
    timeout: number;
    retries: number;
}

export interface AppConfig {
    database: DatabaseConfig;
    scraping: ScrapingConfig;
    cache: CacheConfig;
    browserless: BrowserlessConfig;
    env: 'development' | 'production';
}

function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && !defaultValue) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Invalid number for environment variable ${key}: ${value}`);
    }
    return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
}

export const config: AppConfig = {
    database: {
        type: getEnv('DATABASE_TYPE', 'postgresql') as 'postgresql' | 'sqlite',
        url: getEnv('DATABASE_URL'),
        pool: {
            min: getEnvNumber('DATABASE_POOL_MIN', 2),
            max: getEnvNumber('DATABASE_POOL_MAX', 10)
        }
    },

    scraping: {
        maxResults: getEnvNumber('SCRAPING_MAX_RESULTS', 10),
        parallelRequests: getEnvNumber('SCRAPING_PARALLEL_REQUESTS', 3),
        adaptiveTimeout: getEnvBoolean('SCRAPING_ADAPTIVE_TIMEOUT', true),
        retryStrategy: getEnv('SCRAPING_RETRY_STRATEGY', 'exponential') as any,
        baseTimeout: getEnvNumber('SCRAPING_BASE_TIMEOUT', 10000)
    },

    cache: {
        l1TtlMs: getEnvNumber('CACHE_L1_TTL_MS', 5 * 60 * 1000), // 5 minutes
        l2TtlDays: getEnvNumber('CACHE_L2_TTL_DAYS', 30), // 30 days
        popularThreshold: getEnvNumber('CACHE_POPULAR_THRESHOLD', 5),
        cleanupIntervalMs: getEnvNumber('CACHE_CLEANUP_INTERVAL_MS', 60 * 60 * 1000) // 1 hour
    },

    browserless: {
        url: getEnv('BROWSERLESS_URL'),
        token: getEnv('BROWSERLESS_TOKEN'),
        timeout: getEnvNumber('BROWSERLESS_TIMEOUT', 30000),
        retries: getEnvNumber('BROWSERLESS_RETRIES', 3)
    },

    env: (getEnv('NODE_ENV', 'development') as 'development' | 'production')
};

// Validate configuration
export function validateConfig(): void {
    const errors: string[] = [];

    if (!config.database.url) {
        errors.push('DATABASE_URL is required');
    }

    if (!config.browserless.url) {
        errors.push('BROWSERLESS_URL is required');
    }

    if (!config.browserless.token) {
        errors.push('BROWSERLESS_TOKEN is required');
    }

    if (config.scraping.maxResults < 1 || config.scraping.maxResults > 50) {
        errors.push('SCRAPING_MAX_RESULTS must be between 1 and 50');
    }

    if (config.scraping.parallelRequests < 1 || config.scraping.parallelRequests > 10) {
        errors.push('SCRAPING_PARALLEL_REQUESTS must be between 1 and 10');
    }

    if (config.cache.l1TtlMs < 1000) {
        errors.push('CACHE_L1_TTL_MS must be at least 1000ms');
    }

    if (config.cache.l2TtlDays < 1) {
        errors.push('CACHE_L2_TTL_DAYS must be at least 1 day');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    console.log('>>> Configuration validated successfully');
}

// Log configuration (without sensitive data)
export function logConfig(): void {
    console.log('>>> Application Configuration:');
    console.log(`    Environment: ${config.env}`);
    console.log(`    Database Type: ${config.database.type}`);
    console.log(`    Database URL: ${config.database.url.replace(/:[^:@]+@/, ':***@')}`);
    console.log(`    Max Results: ${config.scraping.maxResults}`);
    console.log(`    Parallel Requests: ${config.scraping.parallelRequests}`);
    console.log(`    L1 Cache TTL: ${config.cache.l1TtlMs}ms`);
    console.log(`    L2 Cache TTL: ${config.cache.l2TtlDays} days`);
    console.log(`    Browserless URL: ${config.browserless.url}`);
}
