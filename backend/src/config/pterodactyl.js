const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  baseUrl: process.env.PTERODACTYL_URL || 'https://panel.example.com',
  apiKey: process.env.PTERODACTYL_API_KEY || '',
  clientApiKey: process.env.PTERODACTYL_CLIENT_API_KEY || '',
  applicationApiKey: process.env.PTERODACTYL_APPLICATION_API_KEY || '',
  // Default node/nest/egg IDs - should be configured per game type
  defaultNodeId: parseInt(process.env.PTERODACTYL_NODE_ID || '1'),
  defaultNestId: parseInt(process.env.PTERODACTYL_NEST_ID || '1'),
  // Game type to egg ID mapping (can be overridden via environment)
  gameTypeEggs: {
    minecraft: parseInt(process.env.PTERODACTYL_EGG_ID_MINECRAFT || process.env.PTERODACTYL_EGG_ID || '1'),
    fivem: parseInt(process.env.PTERODACTYL_EGG_ID_FIVEM || '2'),
    other: parseInt(process.env.PTERODACTYL_EGG_ID_OTHER || '1'),
  },
};

