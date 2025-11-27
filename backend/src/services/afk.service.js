const config = require('../config/revenue');
const redis = require('../config/redis');

class AFKService {
  constructor() {
    this.enabled = config.afk.enabled;
    this.coinsPerMinute = config.afk.coinsPerMinute;
    this.maxMinutes = config.afk.maxMinutesPerSession;
    this.cooldownMinutes = config.afk.cooldownMinutes;
  }

  async startSession(userId) {
    if (!this.enabled) {
      throw new Error('AFK page is not enabled');
    }

    const sessionKey = `afk:session:${userId}`;
    const cooldownKey = `afk:cooldown:${userId}`;

    // Check cooldown
    try {
      const cooldown = await redis.get(cooldownKey);
      if (cooldown) {
        const remaining = await redis.ttl(cooldownKey);
        throw new Error(`AFK session on cooldown. Please wait ${Math.ceil(remaining / 60)} minutes.`);
      }
    } catch (error) {
      // If Redis is unavailable, allow the operation but log the issue
      if (error.message.includes('Redis') || error.message.includes('ECONNREFUSED')) {
        console.warn('⚠️  Redis unavailable, skipping cooldown check');
      } else {
        throw error;
      }
    }

    // Check if session already exists
    const existing = await redis.get(sessionKey);
    if (existing) {
      throw new Error('AFK session already active');
    }

    // Create new session
    const sessionData = {
      userId,
      startTime: Date.now(),
      minutes: 0,
    };

    await redis.setEx(sessionKey, this.maxMinutes * 60, JSON.stringify(sessionData));
    
    return {
      sessionId: sessionKey,
      maxMinutes: this.maxMinutes,
      coinsPerMinute: this.coinsPerMinute,
    };
  }

  async updateSession(userId, minutes) {
    const sessionKey = `afk:session:${userId}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      throw new Error('No active AFK session');
    }

    let session;
    try {
      session = JSON.parse(sessionData);
    } catch (error) {
      throw new Error('Invalid session data');
    }

    // Calculate minutes server-side from startTime to prevent manipulation
    const elapsedMinutes = Math.floor((Date.now() - session.startTime) / 60000);
    session.minutes = Math.min(elapsedMinutes, this.maxMinutes);

    await redis.setEx(sessionKey, this.maxMinutes * 60, JSON.stringify(session));
    
    return session;
  }

  async completeSession(userId) {
    const sessionKey = `afk:session:${userId}`;
    const cooldownKey = `afk:cooldown:${userId}`;
    
    const sessionData = await redis.get(sessionKey);
    if (!sessionData) {
      throw new Error('No active AFK session');
    }

    let session;
    try {
      session = JSON.parse(sessionData);
    } catch (error) {
      throw new Error('Invalid session data');
    }

    // Calculate minutes server-side from startTime to prevent manipulation
    const elapsedMinutes = Math.floor((Date.now() - session.startTime) / 60000);
    const minutes = Math.min(elapsedMinutes, this.maxMinutes);
    const coinsEarned = Math.floor(minutes * this.coinsPerMinute);

    // Delete session
    await redis.del(sessionKey);

    // Set cooldown
    await redis.setEx(cooldownKey, this.cooldownMinutes * 60, '1');

    return {
      minutes,
      coinsEarned,
    };
  }

  async getSessionStatus(userId) {
    const sessionKey = `afk:session:${userId}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      return null;
    }

    try {
      const session = JSON.parse(sessionData);
      // Calculate current elapsed time
      const elapsedMinutes = Math.floor((Date.now() - session.startTime) / 60000);
      session.minutes = Math.min(elapsedMinutes, this.maxMinutes);
      return session;
    } catch (error) {
      return null;
    }
  }

  getCoinsPerMinute() {
    return this.coinsPerMinute;
  }

  getMaxMinutes() {
    return this.maxMinutes;
  }
}

module.exports = new AFKService();

