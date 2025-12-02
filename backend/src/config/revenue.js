const dotenv = require('dotenv');
const Settings = require('../models/Settings');

dotenv.config();

// Cache for Linkvertise config
let linkvertiseConfigCache = null;
let linkvertiseConfigCacheTime = null;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get Linkvertise configuration from database, fallback to environment variables
 * @returns {Promise<Object>} Linkvertise configuration object
 */
async function getLinkvertiseConfig() {
  // Check cache first
  if (linkvertiseConfigCache && linkvertiseConfigCacheTime && (Date.now() - linkvertiseConfigCacheTime) < CACHE_TTL) {
    return linkvertiseConfigCache;
  }

  try {
    const dbConfig = await Settings.getLinkvertiseConfig();
    
    // Use database config if set, otherwise fallback to env vars
    // Check for undefined/null explicitly to allow false/0/empty string values from DB
    const config = {
      enabled: dbConfig.enabled !== undefined ? dbConfig.enabled : (process.env.LINKVERTISE_ENABLED === 'true'),
      apiKey: dbConfig.apiKey !== undefined && dbConfig.apiKey !== null ? dbConfig.apiKey : (process.env.LINKVERTISE_API_KEY || ''),
      coinsPerCompletion: dbConfig.coinsPerCompletion !== undefined && dbConfig.coinsPerCompletion !== null ? dbConfig.coinsPerCompletion : parseInt(process.env.LINKVERTISE_COINS || '50', 10),
      cooldownMinutes: dbConfig.cooldownMinutes !== undefined && dbConfig.cooldownMinutes !== null ? dbConfig.cooldownMinutes : parseInt(process.env.LINKVERTISE_COOLDOWN || '30', 10),
      manualMode: dbConfig.manualMode !== undefined ? dbConfig.manualMode : (process.env.LINKVERTISE_MANUAL_MODE !== 'false'),
    };

    // Update cache
    linkvertiseConfigCache = config;
    linkvertiseConfigCacheTime = Date.now();
    
    return config;
  } catch (error) {
    console.error('Error getting Linkvertise config from database, using env vars:', error);
    // Fallback to environment variables
    const config = {
      enabled: process.env.LINKVERTISE_ENABLED === 'true',
      apiKey: process.env.LINKVERTISE_API_KEY || '',
      coinsPerCompletion: parseInt(process.env.LINKVERTISE_COINS || '50', 10),
      cooldownMinutes: parseInt(process.env.LINKVERTISE_COOLDOWN || '30', 10),
      manualMode: process.env.LINKVERTISE_MANUAL_MODE !== 'false',
    };
    return config;
  }
}

/**
 * Clear Linkvertise config cache to force refresh
 */
function clearLinkvertiseCache() {
  linkvertiseConfigCache = null;
  linkvertiseConfigCacheTime = null;
}

module.exports = {
  getLinkvertiseConfig,
  clearLinkvertiseCache,
  linkvertise: {
    // Legacy export for backward compatibility - will use env vars only
    // New code should use getLinkvertiseConfig()
    enabled: process.env.LINKVERTISE_ENABLED === 'true',
    apiKey: process.env.LINKVERTISE_API_KEY || '',
    coinsPerCompletion: parseInt(process.env.LINKVERTISE_COINS || '50', 10),
    cooldownMinutes: parseInt(process.env.LINKVERTISE_COOLDOWN || '30', 10),
  },
  afk: {
    enabled: process.env.AFK_ENABLED === 'true',
    coinsPerMinute: parseFloat(process.env.AFK_COINS_PER_MINUTE || '1'),
    maxMinutesPerSession: parseInt(process.env.AFK_MAX_MINUTES || '60'),
    cooldownMinutes: parseInt(process.env.AFK_COOLDOWN || '15'),
  },
  surveys: {
    enabled: process.env.SURVEYS_ENABLED === 'true',
    minCoins: parseInt(process.env.SURVEY_MIN_COINS || '100'),
    maxCoins: parseInt(process.env.SURVEY_MAX_COINS || '500'),
  },
  ads: {
    enabled: process.env.ADS_ENABLED === 'true',
    coinsPerView: parseInt(process.env.ADS_COINS_PER_VIEW || '10'),
    maxViewsPerDay: parseInt(process.env.ADS_MAX_VIEWS || '20'),
  },
  referral: {
    enabled: process.env.REFERRAL_ENABLED === 'true',
    bonusCoins: parseInt(process.env.REFERRAL_BONUS || '500'),
    commissionPercentage: parseFloat(process.env.REFERRAL_COMMISSION || '10'),
  },
  dailyLogin: {
    enabled: process.env.DAILY_LOGIN_ENABLED === 'true',
    coinsPerDay: parseInt(process.env.DAILY_LOGIN_COINS || '25'),
  },
};

