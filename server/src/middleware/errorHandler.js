import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  console.error('[SERVER ERROR]', err);

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    error: {
      message: err.message || 'An unexpected internal server error occurred.',
      code: err.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    },
  };

  // Only attach details or stack in development
  if (!env.isProduction && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: `Endpoint ${req.method} ${req.originalUrl} not found.`,
      code: 'RESOURCE_NOT_FOUND',
      timestamp: new Date().toISOString(),
    },
  });
}
