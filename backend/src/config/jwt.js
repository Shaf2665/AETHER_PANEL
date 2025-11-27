const dotenv = require('dotenv');

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
}

if (jwtSecret === 'your-secret-key' || jwtSecret.length < 32) {
  console.warn('⚠️  WARNING: JWT_SECRET is using a weak or default value. Please use a strong, random secret (at least 32 characters).');
}

module.exports = {
  secret: jwtSecret,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

