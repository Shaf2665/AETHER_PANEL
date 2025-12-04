const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
dotenv.config();

// Validate environment variables
const { validateEnv } = require('./config/env');
validateEnv();

// Import routes
const authRoutes = require('./routes/auth.routes');
const coinRoutes = require('./routes/coin.routes');
const serverRoutes = require('./routes/server.routes');
const revenueRoutes = require('./routes/revenue.routes');
const resourceRoutes = require('./routes/resource.routes');
const adminRoutes = require('./routes/admin.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy configuration (required for reverse proxies like Cloudflare/nginx)
// In production: trust 2 proxies (Cloudflare + nginx)
// In development: trust first proxy only
if (isProduction) {
  app.set('trust proxy', 2); // Trust 2 proxies in production (Cloudflare + nginx)
  console.log('✅ Trust proxy enabled for production (Cloudflare/nginx support)');
} else {
  app.set('trust proxy', 1); // Trust first proxy only in development
  console.log('✅ Trust proxy enabled for development (first proxy only)');
}

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  credentials: true,
  optionsSuccessStatus: 200
};

if (isProduction) {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl || frontendUrl.trim() === '') {
    console.error('❌ ERROR: FRONTEND_URL environment variable is required in production!');
    console.error('   Please set FRONTEND_URL to your frontend URL (e.g., https://dashboard.example.com)');
    console.error('   Multiple origins can be comma-separated (e.g., https://app1.com,https://app2.com)');
    process.exit(1);
  }
  
  // Support multiple origins (comma-separated)
  corsOptions.origin = frontendUrl.includes(',') 
    ? frontendUrl.split(',').map(url => url.trim())
    : frontendUrl.trim();
    
  console.log(`✅ CORS configured for production: ${Array.isArray(corsOptions.origin) ? corsOptions.origin.join(', ') : corsOptions.origin}`);
} else {
  corsOptions.origin = 'http://localhost:3000';
  console.log('✅ CORS configured for development: http://localhost:3000');
}

app.use(cors(corsOptions));

// Rate limiting
// Helper function to get client IP (prioritizes Cloudflare header)
const getClientIP = (req) => {
  if (isProduction) {
    // Prefer Cloudflare's connecting IP header (most reliable)
    if (req.headers['cf-connecting-ip']) {
      return req.headers['cf-connecting-ip'];
    }
    // Fallback to X-Forwarded-For
    if (req.headers['x-forwarded-for']) {
      const forwarded = req.headers['x-forwarded-for'].split(',')[0].trim();
      return forwarded || req.ip;
    }
  }
  return req.ip;
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // limit each IP to 60 requests per windowMs (reduced from 100)
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Explicitly acknowledge trust proxy setting to prevent ValidationError
  trustProxy: isProduction,
  // Custom key generator for better IP detection behind proxy
  keyGenerator: (req) => getClientIP(req),
});

// Apply general limiter to API routes, but skip auth routes (they have their own limiter)
app.use('/api/', (req, res, next) => {
  // Skip general limiter for auth routes (they have their own stricter limiter)
  if (req.path.startsWith('/auth')) {
    return next();
  }
  limiter(req, res, next);
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes (increased to prevent blocking legitimate logins)
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Explicitly acknowledge trust proxy setting
  trustProxy: isProduction,
  keyGenerator: (req) => getClientIP(req),
});

// Stricter rate limiting for revenue endpoints (prevent coin farming)
const revenueLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests to revenue endpoints, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  // Explicitly acknowledge trust proxy setting
  trustProxy: isProduction,
  keyGenerator: (req) => {
    if (isProduction && req.headers['x-forwarded-for']) {
      const forwarded = req.headers['x-forwarded-for'].split(',')[0].trim();
      return forwarded || req.ip;
    }
    return req.ip;
  },
});

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files from React app in production
if (isProduction) {
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(frontendBuildPath));
  
  // Serve React app for all non-API routes (React Router)
  // This must be before error handler but after API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server bound to 0.0.0.0 (accessible from all network interfaces)`);
});

module.exports = app;

