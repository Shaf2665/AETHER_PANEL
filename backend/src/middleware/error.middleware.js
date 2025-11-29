// Sanitize error messages to prevent information disclosure
function sanitizeError(error) {
  if (typeof error !== 'string') {
    error = String(error);
  }
  
  // Remove potential sensitive information
  const sensitivePatterns = [
    /password/gi,
    /secret/gi,
    /token/gi,
    /key/gi,
    /api[_-]?key/gi,
    /authorization/gi,
    /bearer/gi,
  ];
  
  let sanitized = error;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  return sanitized;
}

const errorHandler = (err, req, res, next) => {
  // Log error with context (sanitized in production)
  const isProduction = process.env.NODE_ENV === 'production';
  const errorMessage = isProduction ? sanitizeError(err.message) : err.message;
  const errorStack = isProduction ? undefined : err.stack;
  
  console.error('Error:', {
    message: errorMessage,
    ...(errorStack && { stack: errorStack }),
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Default error
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Validation errors (express-validator)
  if (err.name === 'ValidationError' || Array.isArray(err.errors)) {
    status = 400;
    message = err.message || 'Validation failed';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid authentication token';
  }
  
  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Authentication token expired';
  }

  // Database errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        status = 409;
        message = 'Resource already exists';
        break;
      case '23503': // Foreign key violation
        status = 400;
        message = 'Invalid reference to related resource';
        break;
      case '23502': // Not null violation
        status = 400;
        message = 'Required field is missing';
        break;
      case '23514': // Check violation
        status = 400;
        message = 'Data validation failed';
        break;
      case 'ECONNREFUSED': // Database connection refused
        status = 503;
        message = 'Database service unavailable';
        break;
      case 'ENOTFOUND': // DNS lookup failed
        status = 503;
        message = 'Service temporarily unavailable';
        break;
    }
  }

  // PostgreSQL connection errors
  if (err.code && err.code.startsWith('28')) {
    status = 503;
    message = 'Database connection error';
  }

  // Redis errors
  if (err.message && err.message.includes('Redis')) {
    status = 503;
    message = 'Cache service temporarily unavailable';
  }

  // Rate limit errors
  if (err.status === 429) {
    status = 429;
    message = err.message || 'Too many requests, please try again later';
  }

  // Don't expose internal error details in production
  if (status === 500 && process.env.NODE_ENV === 'production') {
    message = 'An internal server error occurred';
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      details: err.details || null,
    }),
  });
};

module.exports = { errorHandler };

