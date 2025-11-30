const dotenv = require('dotenv');

dotenv.config();

const redirectUri = process.env.DISCORD_REDIRECT_URI || (process.env.FRONTEND_URL 
  ? `${process.env.FRONTEND_URL}/api/auth/discord/callback`
  : 'http://localhost:5000/api/auth/discord/callback');

// Log configuration on startup (without secrets)
if (process.env.DISCORD_ENABLED === 'true') {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Discord OAuth Configuration:');
  console.log('  Client ID:', process.env.DISCORD_CLIENT_ID ? 'SET ✓' : 'MISSING ✗');
  console.log('  Client Secret:', process.env.DISCORD_CLIENT_SECRET ? 'SET ✓' : 'MISSING ✗');
  console.log('  Redirect URI:', redirectUri);
  console.log('  Enabled: true');
  
  // Warn if redirect URI doesn't match expected pattern
  if (!redirectUri.includes('/api/auth/discord/callback')) {
    console.warn('⚠️  WARNING: Redirect URI does not match expected pattern: /api/auth/discord/callback');
  }
  
  // Warn if redirect URI uses HTTP in production
  if (process.env.NODE_ENV === 'production' && redirectUri.startsWith('http://')) {
    console.warn('⚠️  WARNING: Redirect URI uses HTTP instead of HTTPS in production');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('IMPORTANT: Make sure this Redirect URI is added to your Discord application:');
  console.log(`  ${redirectUri}`);
  console.log('  Discord Developer Portal → OAuth2 → Redirects');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

module.exports = {
  clientId: process.env.DISCORD_CLIENT_ID || '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  redirectUri: redirectUri,
  enabled: process.env.DISCORD_ENABLED === 'true',
};

