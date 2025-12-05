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
    
    // Ensure eggIds.minecraft is properly parsed as integer
    let minecraftEggId;
    if (dbConfig.eggIds && dbConfig.eggIds.minecraft !== undefined && dbConfig.eggIds.minecraft !== null) {
      minecraftEggId = parseInt(dbConfig.eggIds.minecraft, 10);
      if (isNaN(minecraftEggId) || minecraftEggId < 1) {
        console.warn('Invalid Minecraft Egg ID from database, using env var fallback:', dbConfig.eggIds.minecraft);
        minecraftEggId = parseInt(process.env.PTERODACTYL_EGG_ID_MINECRAFT || process.env.PTERODACTYL_EGG_ID || '1', 10);
      }
    } else {
      console.warn('Minecraft Egg ID not found in database config, using env var fallback');
      minecraftEggId = parseInt(process.env.PTERODACTYL_EGG_ID_MINECRAFT || process.env.PTERODACTYL_EGG_ID || '1', 10);
    }
    
    // Final validation
    if (isNaN(minecraftEggId) || minecraftEggId < 1) {
      console.error('CRITICAL: Invalid Minecraft Egg ID after all fallbacks:', minecraftEggId);
      minecraftEggId = 1; // Last resort default
    }
    
    cachedConfig = {
      baseUrl: dbConfig.url || process.env.PTERODACTYL_URL || 'https://panel.example.com',
      apiKey: dbConfig.apiKey || process.env.PTERODACTYL_API_KEY || '',
      clientApiKey: dbConfig.clientApiKey || process.env.PTERODACTYL_CLIENT_API_KEY || '',
      applicationApiKey: dbConfig.applicationApiKey || process.env.PTERODACTYL_APPLICATION_API_KEY || '',
      defaultNodeId: dbConfig.nodeId || parseInt(process.env.PTERODACTYL_NODE_ID || '1', 10),
      defaultNestId: dbConfig.nestId || parseInt(process.env.PTERODACTYL_NEST_ID || '1', 10),
      gameTypeEggs: {
        minecraft: minecraftEggId,
      },
      customGames: dbConfig.customGames || [],
    };
    
    console.log('Pterodactyl config loaded:', {
      baseUrl: cachedConfig.baseUrl,
      defaultNodeId: cachedConfig.defaultNodeId,
      defaultNestId: cachedConfig.defaultNestId,
      minecraftEggId: cachedConfig.gameTypeEggs.minecraft,
      customGamesCount: cachedConfig.customGames.length
    });
    
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
      },
      customGames: [],
    };
  }

  return cachedConfig;
}

// Note: Cache is populated lazily on first access or when refresh() is called
// This prevents database queries during module initialization when the database
// may not be fully ready. The refresh() method is called in pterodactyl.service.js
// before making requests to ensure the latest config is used.

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
  },
  customGames: [],
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
  get customGames() {
    return cachedConfig?.customGames || getEnvConfig().customGames;
  },
  // Async function to refresh config
  refresh: getConfig,
  // Clear cache (useful after updates)
  clearCache: () => {
    cachedConfig = null;
    lastCacheTime = 0;
  },
};

