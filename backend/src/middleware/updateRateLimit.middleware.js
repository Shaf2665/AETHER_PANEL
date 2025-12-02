/**
 * Rate limiting middleware for system update endpoint
 * Limits update requests to 1 per hour per user
 */

// In-memory store for rate limiting
// Format: { userId: lastUpdateTimestamp }
const updateRateLimitStore = new Map();

// Cleanup old entries every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [userId, timestamp] of updateRateLimitStore.entries()) {
    if (timestamp < oneHourAgo) {
      updateRateLimitStore.delete(userId);
    }
  }
}, 60 * 60 * 1000); // Run cleanup every hour

/**
 * Rate limit middleware for update endpoint
 * Allows 1 update per hour per user
 */
const updateRateLimit = (req, res, next) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const lastUpdate = updateRateLimitStore.get(userId);
  const now = Date.now();
  const oneHourInMs = 60 * 60 * 1000;

  if (lastUpdate && (now - lastUpdate) < oneHourInMs) {
    const remainingMs = oneHourInMs - (now - lastUpdate);
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    
    return res.status(429).json({
      error: 'Update rate limit exceeded',
      message: `Please wait ${remainingMinutes} minute(s) before requesting another update.`,
      retryAfter: remainingMinutes
    });
  }

  // Update timestamp
  updateRateLimitStore.set(userId, now);
  
  next();
};

module.exports = { updateRateLimit };

