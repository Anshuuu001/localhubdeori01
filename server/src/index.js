import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { testDatabaseConnection } from './config/database.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authenticate } from './middleware/auth.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { UPLOAD_DIR } from './services/storage.service.js';
import apiRouter from './routes/index.js';


const app = express();

// Security and standard middlewares
app.use(cors({
  origin: env.corsOrigin === '*' ? '*' : [env.corsOrigin, 'http://localhost:5180', 'http://127.0.0.1:5180', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(authenticate);


// Basic security response headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Root welcome probe
app.get('/', (req, res) => {
  res.json({
    service: 'LocalHub X Backend API',
    region: 'Deori Taluka, Maharashtra',
    status: 'online',
    phase: 'Phase 1 - Foundation & Responsive Shell',
    healthEndpoint: '/api/health',
    documentation: 'https://github.com/localhub-x',
  });
});

// Serve safe uploads directory statically
app.use('/uploads', express.static(UPLOAD_DIR));


// Mount modular API routes under /api
app.use('/api', apiRouter);


// Catch-all 404 & centralized error handler
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(env.port, async () => {
  console.log('====================================================');
  console.log(` LocalHub X Backend Server`);
  console.log(` Port: ${env.port}`);
  console.log(` Environment: ${env.nodeEnv}`);
  console.log(` Taluka Focus: ${env.taluka.name}, ${env.taluka.district}`);
  console.log(` API Base: http://localhost:${env.port}/api`);
  console.log('====================================================');

  // Perform initial safe DB connection verification
  console.log('[STARTUP] Probing MySQL database configuration...');
  const dbStatus = await testDatabaseConnection();
  if (dbStatus.connected) {
    console.log(`[STARTUP] MySQL Connection: CONNECTED (Database: ${dbStatus.database})`);
  } else if (!dbStatus.configured) {
    console.log(`[STARTUP] MySQL Connection: UNCONFIGURED (${dbStatus.message})`);
  } else {
    console.warn(`[STARTUP] MySQL Connection: DISCONNECTED (${dbStatus.message})`);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    if (process.env.NODE_ENV === 'test') {
      console.log(`[STARTUP] Port ${env.port} is already active, reusing existing instance for tests.`);
    } else {
      console.error(`[FATAL] Port ${env.port} is already in use by another process.`);
      console.error(`[FATAL] Either stop the conflicting process or update PORT in server/.env.`);
      process.exit(1);
    }
  } else {
    console.error('[SERVER ERROR]', err);
  }
});


// Graceful termination
function shutdown() {
  console.log('\n[SHUTDOWN] Closing server gracefully...');
  server.close(() => {
    console.log('[SHUTDOWN] HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
