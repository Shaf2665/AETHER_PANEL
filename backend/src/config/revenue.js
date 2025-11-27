const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  linkvertise: {
    enabled: process.env.LINKVERTISE_ENABLED === 'true',
    apiKey: process.env.LINKVERTISE_API_KEY || '',
    coinsPerCompletion: parseInt(process.env.LINKVERTISE_COINS || '50'),
    cooldownMinutes: parseInt(process.env.LINKVERTISE_COOLDOWN || '30'),
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

