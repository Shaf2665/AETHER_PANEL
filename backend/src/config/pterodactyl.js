const dotenv = require('dotenv');

dotenv.config();

// Cache for settings (refresh on update)
let cachedConfig = null;
let lastCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get configuration from database with environment variable fallback
 * @returns {Promise<Object>} Configuration object
 */
async function getConfig() {
  const now = Date.now();
  if (cachedConfig && (now - lastCacheTime) < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const Settings = require('../models/Settings');
    const dbConfig = await Settings.getPterodactylConfig();
    
    cachedConfig = {
      baseUrl: dbConfig.url || process.env.PTERODACTYL_URL || 'https://panel.example.com',
      apiKey: dbConfig.apiKey || process.env.PTERODACTYL_API_KEY || '',
      clientApiKey: dbConfig.clientApiKey || process.env.PTERODACTYL_CLIENT_API_KEY || '',
      applicationApiKey: dbConfig.applicationApiKey || process.env.PTERODACTYL_APPLICATION_API_KEY || '',
      defaultNodeId: dbConfig.nodeId || parseInt(process.env.PTERODACTYL_NODE_ID || '1', 10),
      defaultNestId: dbConfig.nestId || parseInt(process.env.PTERODACTYL_NEST_ID || '1', 10),
      gameTypeEggs: {
        minecraft: dbConfig.eggIds.minecraft || parseInt(process.env.PTERODACTYL_EGG_ID_MINECRAFT || process.env.PTERODACTYL_EGG_ID || '1', 10),
        fivem: dbConfig.eggIds.fivem || parseInt(process.env.PTERODACTYL_EGG_ID_FIVEM || '2', 10),
        other: dbConfig.eggIds.other || parseInt(process.env.PTERODACTYL_EGG_ID_OTHER || '1', 10),
      },
    };
    lastCacheTime = now;
  } catch (error) {
    console.warn('Failed to load settings from database, using env vars:', error.message);
    // Fallback to env vars only
    cachedConfig = {
      baseUrl: process.env.PTERODACTYL_URL || 'https://panel.example.com',
      apiKey: process.env.PTERODACTYL_API_KEY || '',
      clientApiKey: process.env.PTERODACTYL_CLIENT_API_KEY || '',
      applicationApiKey: process.env.PTERODACTYL_APPLICATION_API_KEY || '',
      defaultNodeId: parseInt(process.env.PTERODACTYL_NODE_ID || '1', 10),
      defaultNestId: parseInt(process.env.PTERODACTYL_NEST_ID || '1', 10),
      gameTypeEggs: {
        minecraft: parseInt(process.env.PTERODACTYL_EGG_ID_MINECRAFT || process.env.PTERODACTYL_EGG_ID || '1', 10),
        fivem: parseInt(process.env.PTERODACTYL_EGG_ID_FIVEM || '2', 10),
        other: parseInt(process.env.PTERODACTYL_EGG_ID_OTHER || '1', 10),
      },
    };
  }

  return cachedConfig;
}

// Initialize cache on module load (non-blocking)
getConfig().catch(() => {
  // Ignore errors during initialization, will use env vars
});

// Export sync getters for backward compatibility (uses cached config)
// These will use env vars until cache is populated
const getEnvConfig = () => ({
  baseUrl: process.env.PTERODACTYL_URL || 'https://panel.example.com',
  apiKey: process.env.PTERODACTYL_API_KEY || '',
  clientApiKey: process.env.PTERODACTYL_CLIENT_API_KEY || '',
  applicationApiKey: process.env.PTERODACTYL_APPLICATION_API_KEY || '',
  defaultNodeId: parseInt(process.env.PTERODACTYL_NODE_ID || '1', 10),
  defaultNestId: parseInt(process.env.PTERODACTYL_NEST_ID || '1', 10),
  gameTypeEggs: {
    minecraft: parseInt(process.env.PTERODACTYL_EGG_ID_MINECRAFT || process.env.PTERODACTYL_EGG_ID || '1', 10),
    fivem: parseInt(process.env.PTERODACTYL_EGG_ID_FIVEM || '2', 10),
    other: parseInt(process.env.PTERODACTYL_EGG_ID_OTHER || '1', 10),
  },
});

module.exports = {
  get baseUrl() { 
    return cachedConfig?.baseUrl || getEnvConfig().baseUrl; 
  },
  get apiKey() { 
    return cachedConfig?.apiKey || getEnvConfig().apiKey; 
  },
  get clientApiKey() { 
    return cachedConfig?.clientApiKey || getEnvConfig().clientApiKey; 
  },
  get applicationApiKey() { 
    return cachedConfig?.applicationApiKey || getEnvConfig().applicationApiKey; 
  },
  get defaultNodeId() { 
    return cachedConfig?.defaultNodeId || getEnvConfig().defaultNodeId; 
  },
  get defaultNestId() { 
    return cachedConfig?.defaultNestId || getEnvConfig().defaultNestId; 
  },
  get gameTypeEggs() { 
    return cachedConfig?.gameTypeEggs || getEnvConfig().gameTypeEggs; 
  },
  // Async function to refresh config
  refresh: getConfig,
  // Clear cache (useful after updates)
  clearCache: () => {
    cachedConfig = null;
    lastCacheTime = 0;
  },
};

