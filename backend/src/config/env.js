const dotenv = require('dotenv');

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Validates required environment variables
 * Throws error and exits if required variables are missing
 */
function validateEnv() {
  const errors = [];

  // Required in all environments
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // Database configuration
  if (!process.env.DB_NAME) {
    errors.push('DB_NAME is required');
  }
  if (!process.env.DB_USER) {
    errors.push('DB_USER is required');
  }
  if (!process.env.DB_PASSWORD) {
    errors.push('DB_PASSWORD is required');
  }

  // Pterodactyl configuration
  if (!process.env.PTERODACTYL_URL) {
    errors.push('PTERODACTYL_URL is required');
  }
  if (!process.env.PTERODACTYL_APPLICATION_API_KEY) {
    errors.push('PTERODACTYL_APPLICATION_API_KEY is required');
  }

  // Production-specific requirements
  if (isProduction) {
    if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.trim() === '') {
      errors.push('FRONTEND_URL is required in production');
    }
  }

  if (errors.length > 0) {
    console.error('❌ Environment variable validation failed:');
    errors.forEach((error) => {
      console.error(`   - ${error}`);
    });
    console.error('\nPlease set the required environment variables in your .env file or environment.');
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
}

module.exports = { validateEnv };

