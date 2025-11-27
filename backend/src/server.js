const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const coinRoutes = require('./routes/coin.routes');
const serverRoutes = require('./routes/server.routes');
const revenueRoutes = require('./routes/revenue.routes');
const resourceRoutes = require('./routes/resource.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  credentials: true,
  optionsSuccessStatus: 200
};

if (isProduction) {
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    // Support multiple origins (comma-separated)
    corsOptions.origin = frontendUrl.includes(',') 
      ? frontendUrl.split(',').map(url => url.trim())
      : frontendUrl;
  } else {
    // Default to a secure origin if not set
    corsOptions.origin = 'https://yourdomain.com';
    console.warn('⚠️  FRONTEND_URL not set in production. Using default origin.');
  }
} else {
  corsOptions.origin = 'http://localhost:3000';
}

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
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

// Serve static files from React app in production
if (isProduction) {
  const frontendBuildPath = path.join(__dirname, '../../frontend/build');
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

