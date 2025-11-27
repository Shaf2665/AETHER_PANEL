const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  baseUrl: process.env.PTERODACTYL_URL || 'https://panel.example.com',
  apiKey: process.env.PTERODACTYL_API_KEY || '',
  clientApiKey: process.env.PTERODACTYL_CLIENT_API_KEY || '',
  applicationApiKey: process.env.PTERODACTYL_APPLICATION_API_KEY || '',
};

