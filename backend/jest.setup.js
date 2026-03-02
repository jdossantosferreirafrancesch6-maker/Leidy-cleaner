// Jest setup after environment is ready.
// Place global mocks or test utilities here.
jest.setTimeout(60000); // Increased timeout to 60 seconds

// Ensure test environment variables are loaded
require('dotenv').config({ path: '.env.test' });
process.env.NODE_ENV = 'test';

const path = require('path');

const { Pool } = require('pg');
let pool = null;

// Always use PostgreSQL for tests
pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'leidycleaner_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

beforeAll(async () => {
  // If tests are configured to use PostgreSQL we attempt to bring up a
  // Docker Compose stack (mirroring frontend global-setup).  SQLite tests
  // skip container startup entirely.
  if (process.env.DB_TYPE === 'postgres') {
    try {
      const { execSync } = require('child_process');
      const repoRoot = require('path').resolve(__dirname, '..');
      // start containers (idempotent)
      execSync(`docker-compose -f ${repoRoot}/docker-compose.test.yml up -d`, { stdio: 'inherit' });

      // wait for postgres readiness
      for (let i = 0; i < 20; i++) {
        try {
          execSync('docker exec leidycleaner-postgres-test pg_isready -U postgres', { stdio: 'ignore' });
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // ensure the test database exists
      try {
        execSync(`docker exec leidycleaner-postgres-test createdb -U postgres ${process.env.DB_NAME || 'leidycleaner_test'} 2>/dev/null || true`, { stdio: 'inherit' });
      } catch {
        // ignore
      }
    } catch (e) {
      console.warn('⚠️  could not start test containers or create database', e && e.message);
    }
  }
  try {
    console.log('🧹 Setting up test database...');

    // If using SQLite for tests, prefer an ephemeral file in the system tmp
    // directory to avoid permission issues on workspace-mounted paths.
    if (process.env.DB_TYPE === 'sqlite') {
      try {
        const os = require('os');
        const fs = require('fs');
        const path = require('path');
        // prefer explicit DATABASE_LOCAL if provided; otherwise create a per-run tmp file
        if (!process.env.DATABASE_LOCAL) {
          const tmpFile = path.join(os.tmpdir(), `leidycleaner_test_${process.pid}_${Date.now()}.db`);
          process.env.DATABASE_LOCAL = tmpFile;
        }
        const dbDir = require('path').dirname(process.env.DATABASE_LOCAL);
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true, mode: 0o777 });
        // Remove any previous test DB file before running migrations to avoid
        // deleting an open handle later (which can lead to SQLITE_READONLY).
        try {
          const dbPath = process.env.DATABASE_LOCAL;
          if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
        } catch (e) {
          // ignore cleanup errors
        }
      } catch (e) {
        console.warn('⚠️  Could not prepare tmp sqlite dir:', e && e.message);
      }
    }

    // First, run migrations to create tables
    console.log('🔄 Running migrations...');
    try {
      const { runMigrations } = require('./src/db/runMigrations');
      await runMigrations();
      console.log('✅ Migrations completed');
    } catch (migErr) {
      console.warn('⚠️  Migration error (may be expected if tables already exist):', migErr && migErr.message);
    }

    // Truncate all tables for clean test state
    if (process.env.DB_TYPE === 'sqlite') {
      // nothing: sqlite cleanup already handled before migrations
    } else {
      try {
        await pool.query('TRUNCATE TABLE bookings, reviews, services, users, company_info, staff_availability RESTART IDENTITY CASCADE');
        console.log('✅ Database truncated successfully');
      } catch (pgErr) {
        console.warn('⚠️  Truncate failed (tables may not exist yet):', pgErr && pgErr.message);
      }
    }

    // Reseed default data
    console.log('🌱 Seeding test data...');
    // Ensure test env variables are set
    process.env.NODE_ENV = 'test';

    // Clear require cache to ensure fresh load
    delete require.cache[require.resolve('./src/db/seed')];
    delete require.cache[require.resolve('./src/utils/database')];
    delete require.cache[require.resolve('./src/utils/logger')];

    const { seedDatabase } = require('./src/db/seed');
    await seedDatabase();
    console.log('✅ Test data seeded successfully');
  } catch (err) {
    console.error('❌ Error in beforeAll:', err.message);
    console.error('Stack:', err.stack);
    throw err;
  }
});

afterAll(async () => {
  try {
    // Stop background tasks that keep Node running
    try {
      const { cache } = require('./src/utils/cache');
      if (cache && typeof cache.stopCleanup === 'function') cache.stopCleanup();
    } catch (e) {}

    // Close DB connections (Postgres pool or SQLite)
    try {
      const { closeDatabase } = require('./src/utils/database');
      if (typeof closeDatabase === 'function') await closeDatabase();
    } catch (e) {}

    // Close HTTP server if running
    try {
      const { closeServer } = require('./src/main');
      if (typeof closeServer === 'function') await closeServer();
    } catch (e) {}

    // Try to close other common long-lived clients (redis, bull queues, socket.io, cron)
    try {
      // Redis client helper
      try {
        const redisClient = require('./src/utils/redis');
        if (redisClient && typeof redisClient.quit === 'function') await redisClient.quit();
        if (redisClient && typeof redisClient.disconnect === 'function') redisClient.disconnect();
      } catch (e) {}

      // Bull / Queue services
      try {
        const emailQueue = require('./src/services/EmailQueueService');
        if (emailQueue && typeof emailQueue.close === 'function') await emailQueue.close();
      } catch (e) {}

      // Socket.io server
      try {
        const socket = require('./src/utils/socket');
        if (socket && typeof socket.close === 'function') await socket.close();
      } catch (e) {}

      // Node-cron jobs: try to stop if exported
      try {
        const jobs = require('./src/utils/cronJobs');
        if (jobs && typeof jobs.stopAll === 'function') jobs.stopAll();
      } catch (e) {}
    } catch (e) {}

    if (pool) await pool.end();
    // If using ephemeral sqlite file for tests, try to remove it to avoid
    // accumulating files in /tmp across runs.
    try {
      if (process.env.DB_TYPE === 'sqlite' && process.env.DATABASE_LOCAL) {
        const fs = require('fs');
        const dbPath = process.env.DATABASE_LOCAL;
        if (fs.existsSync(dbPath)) {
          try {
            fs.unlinkSync(dbPath);
          } catch (e) {
            // best-effort cleanup, ignore errors
          }
        }
      }
    } catch (e) {}

    console.log('✅ Database connection closed');
  } catch (err) {
    console.error('❌ Error closing database:', err.message);
  }
});