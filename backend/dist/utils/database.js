"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.getDatabase = exports.getClient = exports.query = void 0;
exports.waitForDatabase = waitForDatabase;
const pg_1 = __importDefault(require("pg"));
const logger_1 = require("./logger");
const { Pool } = pg_1.default;
logger_1.logger.info('Database module loaded - PostgreSQL mode');
// PostgreSQL configuration only
let pool = null;
// Initialize database connection (PostgreSQL)
const initDatabase = () => {
    logger_1.logger.info('🐘 Setting up PostgreSQL database...');
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
            logger_1.logger.info('✅ PostgreSQL pool connected');
        });
        pool.on('error', (error) => {
            logger_1.logger.error('❌ PostgreSQL pool error:', error);
        });
    }
    return pool;
};
// Universal query function (PostgreSQL only)
const query = async (text, params) => {
    // Lazy initialization
    if (!pool) {
        initDatabase();
    }
    return new Promise((resolve, reject) => {
        // Add explicit timeout to prevent hanging
        const timeoutHandle = setTimeout(() => {
            reject(new Error(`Database query timeout after 10 seconds: ${text.slice(0, 100)}`));
        }, 10000);
        // Helper to clean timeout and resolve
        const wrappedResolve = (value) => {
            clearTimeout(timeoutHandle);
            resolve(value);
        };
        // Helper to clean timeout and reject
        const wrappedReject = (error) => {
            clearTimeout(timeoutHandle);
            reject(error);
        };
        if (pool) {
            pool.query(text, params)
                .then(result => wrappedResolve(result.rows))
                .catch(wrappedReject);
        }
        else {
            wrappedReject(new Error('Database not initialized'));
        }
    });
};
exports.query = query;
const getClient = async () => {
    if (pool) {
        return await pool.connect();
    }
    else {
        throw new Error('Database not initialized');
    }
};
exports.getClient = getClient;
// Get database instance
const getDatabase = () => {
    return pool || initDatabase();
};
exports.getDatabase = getDatabase;
// Wait until the database is accepting connections by issuing a simple query
async function waitForDatabase(options) {
    const timeout = options?.timeoutMs ?? 15000;
    const interval = options?.intervalMs ?? 200;
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            await (0, exports.query)('SELECT 1');
            return;
        }
        catch (err) {
            // if connection refused or similar, pause and retry
            await new Promise((r) => setTimeout(r, interval));
            continue;
        }
    }
    throw new Error(`Timed out waiting for database after ${timeout}ms`);
}
exports.default = exports.getDatabase;
const closeDatabaseGracefully = async () => {
    try {
        if (pool) {
            await pool.end();
            logger_1.logger.info('✅ PostgreSQL database closed gracefully');
            pool = null;
        }
    }
    catch (err) {
        logger_1.logger.error('Error closing database:', err);
    }
};
process.on('SIGINT', closeDatabaseGracefully);
process.on('SIGTERM', closeDatabaseGracefully);
// Exported helper to allow tests to close DB connections gracefully
exports.closeDatabase = closeDatabaseGracefully;
//# sourceMappingURL=database.js.map