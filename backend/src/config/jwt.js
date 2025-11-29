const dotenv = require('dotenv');

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
}

if (jwtSecret === 'your-secret-key' || jwtSecret.length < 32) {
  throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long and cannot use the default value "your-secret-key". Please set a strong, random secret in your .env file. Application cannot start with a weak secret.');
}

module.exports = {
  secret: jwtSecret,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

