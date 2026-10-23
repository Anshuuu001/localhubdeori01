import mysql from 'mysql2/promise';
import { env } from './env.js';

let pool = null;
let lastConnectionStatus = {
  configured: false,
  connected: false,
  checkedAt: null,
  message: 'Database connection has not been initialized.',
};

/**
 * Initializes the MySQL connection pool safely.
 * Will not crash the server if database credentials are not yet supplied or invalid.
 */
export function getPool() {
  if (pool) return pool;

  if (!env.db.isConfigured) {
    lastConnectionStatus = {
      configured: false,
      connected: false,
      checkedAt: new Date().toISOString(),
      message: 'Database credentials are not yet configured in server/.env (DB_PASSWORD is empty).',
    };
    return null;
  }

  try {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      waitForConnections: true,
      connectionLimit: env.db.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    return pool;
  } catch (err) {
    lastConnectionStatus = {
      configured: true,
      connected: false,
      checkedAt: new Date().toISOString(),
      message: `Failed to create pool: ${err.message}`,
    };
    return null;
  }
}

/**
 * Performs a safe health check on MySQL connectivity without modifying any data.
 * Returns honest status: connected, disconnected, or unconfigured.
 */
export async function testDatabaseConnection() {
  const currentPool = getPool();

  if (!currentPool) {
    return {
      configured: false,
      connected: false,
      checkedAt: new Date().toISOString(),
      host: env.db.host,
      database: env.db.database,
      message: 'Database connection is unconfigured. Set DB_USER and DB_PASSWORD in server/.env.',
    };
  }

  try {
    const connection = await currentPool.getConnection();
    const [rows] = await connection.query('SELECT 1 + 1 AS health_ping, VERSION() AS mysql_version');
    connection.release();

    lastConnectionStatus = {
      configured: true,
      connected: true,
      checkedAt: new Date().toISOString(),
      host: env.db.host,
      database: env.db.database,
      version: rows[0]?.mysql_version || '8.x',
      message: 'Successfully connected to MySQL database.',
    };
    return lastConnectionStatus;
  } catch (err) {
    lastConnectionStatus = {
      configured: true,
      connected: false,
      checkedAt: new Date().toISOString(),
      host: env.db.host,
      database: env.db.database,
      errorCode: err.code,
      message: `Database connection failed: ${err.message}`,
    };
    return lastConnectionStatus;
  }
}

/**
 * Executes a parameterized SQL query safely.
 * @param {string} sql
 * @param {Array<any>} params
 */
export async function executeQuery(sql, params = []) {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error('Database is not connected. Configure credentials in server/.env first.');
  }
  return await currentPool.execute(sql, params);
}

/**
 * Runs a transactional callback with automatic commit and rollback.
 * @param {(conn: mysql.PoolConnection) => Promise<any>} callback
 */
export async function withTransaction(callback) {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error('Database is not connected. Configure credentials in server/.env first.');
  }
  const conn = await currentPool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export function getConnectionStatus() {
  return lastConnectionStatus;
}

