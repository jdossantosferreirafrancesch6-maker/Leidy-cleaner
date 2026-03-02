"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../utils/database");
const logger_1 = require("../utils/logger");
async function runMigrations() {
    try {
        logger_1.logger.info('🔄 Starting database migrations...');
        // Create migrations tracking table (PostgreSQL only)
        const createMigrationsTableSQL = `CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
        logger_1.logger.info('📊 Creating migrations table if not exists...');
        await (0, database_1.query)(createMigrationsTableSQL);
        logger_1.logger.info('✅ Migrations table ready');
        // In test environment, clear migrations tracking so tests always apply current SQL
        if (require('../config').NODE_ENV === 'test') {
            logger_1.logger.info('🧹 Clearing migrations table for test environment');
            await (0, database_1.query)('DELETE FROM migrations');
        }
        // Read all migration files from PostgreSQL migrations directory
        const migrationsDir = path_1.default.join(__dirname, '../../migrations');
        // Verify the directory exists
        if (!fs_1.default.existsSync(migrationsDir)) {
            logger_1.logger.error(`❌ Migrations directory does not exist: ${migrationsDir}`);
            throw new Error(`Migrations directory not found: ${migrationsDir}`);
        }
        const migrationFiles = fs_1.default.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();
        logger_1.logger.info(`Found ${migrationFiles.length} migration files`);
        if (migrationFiles.length === 0) {
            logger_1.logger.warn('⚠️  No migration files found!');
        }
        for (const file of migrationFiles) {
            const migrationName = file.replace('.sql', '');
            // Check if migration already executed
            const result = await (0, database_1.query)('SELECT * FROM migrations WHERE name = $1', [migrationName]);
            if (result.length > 0) {
                logger_1.logger.info(`✅ Migration already executed: ${migrationName}`);
                continue;
            }
            // Read and execute migration
            const filePath = path_1.default.join(migrationsDir, file);
            const sql = fs_1.default.readFileSync(filePath, 'utf-8');
            logger_1.logger.info(`🚀 Executing migration: ${migrationName}`);
            // Execute all statements in the SQL file
            const cleaned = sql.replace(/--.*$/gm, '');
            const statements = cleaned
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);
            for (const statement of statements) {
                try {
                    logger_1.logger.info(`Executing SQL: ${statement.slice(0, 100).replace(/\n/g, ' ')}...`);
                    await (0, database_1.query)(statement);
                }
                catch (err) {
                    logger_1.logger.error('Error executing statement:', statement.slice(0, 100).replace(/\n/g, ' '));
                    // Ignore benign errors that may occur when re-applying migrations
                    const msg = err instanceof Error ? err.message : String(err);
                    const ignorable = [
                        'already exists',
                        'duplicate column name',
                        'column already exists'
                    ];
                    if (ignorable.some(substr => msg.toLowerCase().includes(substr))) {
                        logger_1.logger.warn(`⚠️  Ignoring migration error: ${msg}`);
                        continue;
                    }
                    throw err;
                }
            }
            // Record migration as executed
            await (0, database_1.query)('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
            logger_1.logger.info(`✨ Migration completed: ${migrationName}`);
        }
        logger_1.logger.info('✅ All migrations completed successfully!');
    }
    catch (err) {
        // Log full error to console as well to ensure stack is visible in CI/logs
        console.error('Full migration error:', err);
        logger_1.logger.error('❌ Migration failed:', err);
        throw err; // Re-throw so caller can handle
    }
}
// Run if called directly
if (require.main === module) {
    runMigrations();
}
//# sourceMappingURL=runMigrations.js.map