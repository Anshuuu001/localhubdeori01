import { env } from '../config/env.js';
import { testDatabaseConnection, getConnectionStatus } from '../config/database.js';

export async function getHealth(req, res, next) {
  try {
    const dbStatus = await testDatabaseConnection();

    res.json({
      success: true,
      service: 'LocalHub X Backend API',
      version: '1.0.0-phase1',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.nodeEnv,
      taluka: env.taluka,
      database: dbStatus,
      phase: {
        current: 'Phase 1 - Foundation & Responsive Shell',
        status: 'Active',
      },
    });
  } catch (err) {
    next(err);
  }
}
