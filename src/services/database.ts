import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

interface DatabaseConfig {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class DatabaseService {
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = {
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ...config
    };
  }

  /**
   * Initialize database connection pool
   */
  async init(): Promise<void> {
    if (this.pool) {
      console.log('>>> Database pool already initialized');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: this.config.connectionString,
        max: this.config.max,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis,
        ssl: {
          rejectUnauthorized: false // Neon requires SSL
        }
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      console.log('>>> Database pool initialized successfully');
      
      // Setup error handlers
      this.pool.on('error', (err) => {
        console.error('>>> Unexpected database pool error:', err);
      });

    } catch (error: any) {
      console.error('>>> Database initialization failed:', error.message);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call init() first.');
    }

    try {
      const start = Date.now();
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        console.log(`>>> Slow query (${duration}ms): ${text.substring(0, 100)}...`);
      }
      
      return result;
    } catch (error: any) {
      console.error('>>> Query error:', error.message);
      console.error('>>> Query:', text);
      console.error('>>> Params:', params);
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call init() first.');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run migrations from schema.sql
   */
  async runMigrations(schemaPath: string): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call init() first.');
    }

    try {
      const fs = await import('fs/promises');
      const schema = await fs.readFile(schemaPath, 'utf-8');
      
      console.log('>>> Running database migrations...');
      await this.query(schema);
      console.log('>>> Migrations completed successfully');
    } catch (error: any) {
      console.error('>>> Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0]?.health === 1;
    } catch (error) {
      console.error('>>> Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('>>> Database pool closed');
    }
  }
}

// Singleton instance
let dbInstance: DatabaseService | null = null;

export function getDatabaseService(connectionString?: string): DatabaseService {
  if (!dbInstance) {
    if (!connectionString) {
      throw new Error('Database connection string required for first initialization');
    }
    dbInstance = new DatabaseService({ connectionString });
  }
  return dbInstance;
}

export async function initDatabase(connectionString: string, schemaPath?: string): Promise<DatabaseService> {
  const db = getDatabaseService(connectionString);
  await db.init();
  
  if (schemaPath) {
    await db.runMigrations(schemaPath);
  }
  
  return db;
}
