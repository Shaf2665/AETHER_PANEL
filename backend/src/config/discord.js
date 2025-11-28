const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  clientId: process.env.DISCORD_CLIENT_ID || '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  redirectUri: process.env.DISCORD_REDIRECT_URI || (process.env.FRONTEND_URL 
    ? `${process.env.FRONTEND_URL}/api/auth/discord/callback`
    : 'http://localhost:5000/api/auth/discord/callback'),
  enabled: process.env.DISCORD_ENABLED === 'true',
};

