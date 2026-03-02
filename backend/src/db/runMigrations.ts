import fs from 'fs';
import path from 'path';
import { query } from '../utils/database';
import { logger } from '../utils/logger';

async function runMigrations() {
  try {
    logger.info('🔄 Starting database migrations...');
    const DB_TYPE = process.env.DB_TYPE || (process.env.DATABASE_URL?.startsWith('sqlite') ? 'sqlite' : 'postgres');

    // Create migrations tracking table
    let createMigrationsTableSQL = '';
    if (DB_TYPE === 'sqlite') {
      createMigrationsTableSQL = `CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;
    } else {
      createMigrationsTableSQL = `CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    }

    logger.info('📊 Creating migrations table if not exists...');
    await query(createMigrationsTableSQL);
    logger.info('✅ Migrations table ready');

    // In test environment, clear migrations tracking so tests always apply current SQL
    if (require('../config').NODE_ENV === 'test') {
      logger.info('🧹 Clearing migrations table for test environment');
      await query('DELETE FROM migrations');
    }

    // Read migration files from appropriate directory
    const migrationsDir = path.join(__dirname, DB_TYPE === 'sqlite' ? '../../migrations_sqlite' : '../../migrations');
    
    // Verify the directory exists
    if (!fs.existsSync(migrationsDir)) {
      logger.error(`❌ Migrations directory does not exist: ${migrationsDir}`);
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    logger.info(`Found ${migrationFiles.length} migration files`);
    if (migrationFiles.length === 0) {
      logger.warn('⚠️  No migration files found!');
    }

    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');
      
      // Check if migration already executed
      const result = await query(
        'SELECT * FROM migrations WHERE name = $1',
        [migrationName]
      );

      if ((result as any[]).length > 0) {
        logger.info(`✅ Migration already executed: ${migrationName}`);
        continue;
      }

      // Read and execute migration
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      logger.info(`🚀 Executing migration: ${migrationName}`);
      
      // Execute all statements in the SQL file
      const cleaned = sql.replace(/--.*$/gm, '');
      const statements = cleaned
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        try {
          logger.info(`Executing SQL: ${statement.slice(0, 100).replace(/\n/g, ' ')}...`);
          await query(statement);
        } catch (err) {
          logger.error('Error executing statement:', statement.slice(0, 100).replace(/\n/g, ' '));
          // Ignore benign errors that may occur when re-applying migrations
          const msg = err instanceof Error ? err.message : String(err);
          const ignorable = [
            'already exists',
            'duplicate column name',
            'column already exists'
          ];

          if (ignorable.some(substr => msg.toLowerCase().includes(substr))) {
            logger.warn(`⚠️  Ignoring migration error: ${msg}`);
            continue;
          }

          throw err;
        }
      }

      // Record migration as executed
      await query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migrationName]
      );

      logger.info(`✨ Migration completed: ${migrationName}`);
    }

    logger.info('✅ All migrations completed successfully!');
  } catch (err) {
    // Log full error to console as well to ensure stack is visible in CI/logs
    console.error('Full migration error:', err);
    logger.error('❌ Migration failed:', err);
    throw err;  // Re-throw so caller can handle
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
