const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Rate limiting middleware for store management endpoints
 * Limits store management requests to 10 per minute per IP
 */
const storeRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many store management requests from this IP, please try again after a minute.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Explicitly acknowledge trust proxy setting
  trustProxy: isProduction,
  // Custom key generator for better IP detection behind proxy
  keyGenerator: (req) => {
    if (isProduction && req.headers['x-forwarded-for']) {
      const forwarded = req.headers['x-forwarded-for'].split(',')[0].trim();
      return forwarded || req.ip;
    }
    return req.ip;
  },
});

module.exports = { storeRateLimit };

