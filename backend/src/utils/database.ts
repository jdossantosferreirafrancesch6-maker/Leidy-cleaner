import pg from 'pg';
import { logger } from './logger';

const { Pool } = pg;

// detect database type: postgres or sqlite (used mainly in tests/local dev)
export const DB_TYPE = process.env.DB_TYPE || (process.env.DATABASE_URL?.startsWith('sqlite') ? 'sqlite' : 'postgres');
logger.info(`Database module loaded - ${DB_TYPE.toUpperCase()} mode`);

// holders for each kind of connection
let pool: pg.Pool | null = null;
let sqliteDb: any = null;

// Initialize database connection according to type
const initDatabase = () => {
  if (DB_TYPE === 'sqlite') {
    logger.info('📦 Setting up SQLite database...');
    if (!sqliteDb) {
      const sqlite3 = require('sqlite3').verbose();
      const fs = require('fs');
      const file = process.env.DATABASE_LOCAL || './data/data.db';
      // log the resolved file and its permissions to help diagnose readonly errors
      try {
        const exists = fs.existsSync(file);
        logger.info(`SQLite file path: ${file} (exists=${exists})`);
        if (exists) {
          const st = fs.statSync(file);
          logger.info(`SQLite file stat: uid=${st.uid} gid=${st.gid} mode=${(st.mode & 0o777).toString(8)}`);
        } else {
          // also log data directory perms
          const dir = require('path').dirname(file);
          if (fs.existsSync(dir)) {
            const dst = fs.statSync(dir);
            logger.info(`SQLite dir stat: ${dir} uid=${dst.uid} gid=${dst.gid} mode=${(dst.mode & 0o777).toString(8)}`);
          }
        }
      } catch (e) {
        logger.debug('Could not stat sqlite file/dir', String(e));
      }

      sqliteDb = new sqlite3.Database(file);
      // enable foreign keys
      sqliteDb.run('PRAGMA foreign_keys = ON');
    }
    return sqliteDb;
  }

  logger.info('🐘 Setting up PostgreSQL database...');
  if (!pool) {
    // Use DATABASE_URL if available, otherwise construct from individual vars
    const dbConfig = process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || (process.env.NODE_ENV === 'test' ? 'leidy_cleaner_test' : 'leidy_cleaner_dev'),
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
        };

    pool = new Pool({
      ...dbConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('connect', () => {
      logger.info('✅ PostgreSQL pool connected');
    });

    pool.on('error', (error: Error) => {
      logger.error('❌ PostgreSQL pool error:', error);
    });
  }
  return DB_TYPE === 'sqlite' ? sqliteDb : pool;
};

// Universal query function (PostgreSQL only)
export const query = async (text: string, params?: any[]): Promise<any[]> => {
  // Lazy initialization
  if (DB_TYPE === 'sqlite') {
    if (!sqliteDb) initDatabase();

    // SQLite doesn't understand Postgres-style $1, $2 placeholders when using
    // the `sqlite3` library with an array of values. Convert them to `?`.
    // This allows the same SQL strings written for Postgres to work in tests.
    let sql = text.replace(/\$\d+/g, '?');

    // debug each sqlite query when running in test/dev to help track odd
    // behaviours such as the mysterious foreign-key failure we observed.
    // stringify everything because the logger drops additional arguments.
    logger.debug('SQLite query ' + JSON.stringify({ sql, params: params ? JSON.stringify(params) : null }));

    return new Promise<any[]>((resolve, reject) => {
      sqliteDb.all(sql, params || [], (err: any, rows: any[]) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
  if (!pool) {
    initDatabase();
  }
  
  return new Promise<any[]>((resolve, reject) => {
    // Add explicit timeout to prevent hanging
    const timeoutHandle = setTimeout(() => {
      reject(new Error(`Database query timeout after 10 seconds: ${text.slice(0, 100)}`));
    }, 10000);
    
    // Helper to clean timeout and resolve
    const wrappedResolve = (value: any[]) => {
      clearTimeout(timeoutHandle);
      resolve(value);
    };
    
    // Helper to clean timeout and reject
    const wrappedReject = (error: any) => {
      clearTimeout(timeoutHandle);
      reject(error);
    };
    
    if (pool) {
      pool.query(text, params)
        .then(result => wrappedResolve(result.rows))
        .catch(wrappedReject);
    } else {
      wrappedReject(new Error('Database not initialized'));
    }
  });
};

export const getClient = async () => {
  if (DB_TYPE === 'sqlite') {
    throw new Error('getClient is not supported for SQLite');
  }
  if (pool) {
    return await pool.connect();
  } else {
    throw new Error('Database not initialized');
  }
};

// Get database instance
export const getDatabase = () => {
  return pool || initDatabase();
};

// Wait until the database is accepting connections by issuing a simple query
export async function waitForDatabase(options?: {timeoutMs?: number; intervalMs?: number}) {
  if (DB_TYPE === 'sqlite') {
    // SQLite is immediately available
    return;
  }
  const timeout = options?.timeoutMs ?? 15000;
  const interval = options?.intervalMs ?? 200;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await query('SELECT 1');
      return;
    } catch (err) {
      // if connection refused or similar, pause and retry
      await new Promise((r) => setTimeout(r, interval));
      continue;
    }
  }
  throw new Error(`Timed out waiting for database after ${timeout}ms`);
}

export default getDatabase;

const closeDatabaseGracefully = async () => {
  try {
    if (pool) {
      await pool.end();
      logger.info('✅ PostgreSQL database closed gracefully');
      pool = null;
    }
  } catch (err) {
    logger.error('Error closing database:', err);
  }
};

process.on('SIGINT', closeDatabaseGracefully);
process.on('SIGTERM', closeDatabaseGracefully);

// Exported helper to allow tests to close DB connections gracefully
export const closeDatabase = closeDatabaseGracefully;
