const redis = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});

client.on('connect', () => {
  console.log('✅ Redis connected');
});

client.on('error', (err) => {
  console.error('❌ Redis connection error:', {
    message: err.message,
    code: err.code,
    timestamp: new Date().toISOString(),
  });
  // Don't crash the app if Redis is unavailable
  // The application can continue without Redis (with degraded functionality)
});

// Connect to Redis
if (process.env.REDIS_ENABLED !== 'false') {
  client.connect().catch((err) => {
    console.error('❌ Failed to connect to Redis:', err.message);
    console.warn('⚠️  Application will continue without Redis. Some features may be unavailable.');
  });
}

module.exports = client;

