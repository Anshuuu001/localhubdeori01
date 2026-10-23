import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { testDatabaseConnection } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('----------------------------------------------------');
  console.log('LocalHub X - Database Migration Runner');
  console.log('----------------------------------------------------');

  if (!env.db.isConfigured) {
    console.warn('[NOTICE] MySQL credentials are not yet configured in server/.env.');
    console.warn('Set DB_USER and DB_PASSWORD to run migrations against your MySQL instance.');
    process.exit(0);
  }

  console.log(`Connecting to MySQL host: ${env.db.host}:${env.db.port} as user: ${env.db.user}`);

  // Create database connection (without selecting DB first to ensure DB exists)
  let rootConn;
  try {
    rootConn = await mysql.createConnection({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      multipleStatements: true,
    });

    console.log(`Ensuring database '${env.db.database}' exists...`);
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.changeUser({ database: env.db.database });

    // Ensure schema_migrations table exists
    await rootConn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Read migration files
    const migrationsDir = path.resolve(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const [applied] = await rootConn.execute(
        'SELECT id FROM schema_migrations WHERE migration_name = ?',
        [file]
      );

      if (applied.length > 0) {
        console.log(`[SKIPPED] ${file} (already applied)`);
        continue;
      }

      console.log(`[APPLYING] ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await rootConn.query(sql);

      await rootConn.execute(
        'INSERT INTO schema_migrations (migration_name) VALUES (?)',
        [file]
      );
      console.log(`[SUCCESS] ${file} applied successfully.`);
    }

    console.log('All migrations applied successfully.');
  } catch (err) {
    console.error(`[ERROR] Migration failed: ${err.message}`);
    process.exit(1);
  } finally {
    if (rootConn) await rootConn.end();
  }
}

// Only execute directly if invoked via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations();
}

export { runMigrations };
