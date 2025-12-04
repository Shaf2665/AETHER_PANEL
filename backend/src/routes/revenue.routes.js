const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const linkvertiseService = require('../services/linkvertise.service');
const afkService = require('../services/afk.service');
const coinService = require('../services/coin.service');
const RevenueTask = require('../models/RevenueTask');
const redis = require('../config/redis');

const router = express.Router();

const isProduction = process.env.NODE_ENV === 'production';

// Stricter rate limiting for revenue endpoints (prevent coin farming)
const revenueLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests to revenue endpoints, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  // Explicitly acknowledge trust proxy setting
  trustProxy: isProduction,
  // Custom key generator for better IP detection behind proxy
  keyGenerator: (req) => {
    if (isProduction && req.headers['x-forwarded-for']) {
      const forwarded = req.headers['x-forwarded-for'].split(',')[0].trim();
      return forwarded || req.ip;
    }
    return req.ip;
  },
});

// All routes require authentication and rate limiting
router.use(authenticate);
router.use(revenueLimiter);

// Get available revenue tasks
router.get('/tasks', async (req, res, next) => {
  try {
    const tasks = await RevenueTask.findByUserId(req.user.id, 'pending');
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// Generate Linkvertise link
router.post('/linkvertise/generate', [
  body('targetUrl').isURL({ 
    protocols: ['http', 'https'], 
    require_protocol: true,
    require_valid_protocol: true
  }).withMessage('Invalid URL format. Must be http:// or https://'),
], validate, async (req, res, next) => {
  try {
    const { targetUrl } = req.body;
    
    // Additional security: Validate URL is not internal/localhost
    try {
      const url = new URL(targetUrl);
      const hostname = url.hostname.toLowerCase();
      
      // Block internal/localhost URLs to prevent SSRF
      if (hostname === 'localhost' || 
          hostname === '127.0.0.1' || 
          hostname === '0.0.0.0' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.16.') ||
          hostname.startsWith('172.17.') ||
          hostname.startsWith('172.18.') ||
          hostname.startsWith('172.19.') ||
          hostname.startsWith('172.20.') ||
          hostname.startsWith('172.21.') ||
          hostname.startsWith('172.22.') ||
          hostname.startsWith('172.23.') ||
          hostname.startsWith('172.24.') ||
          hostname.startsWith('172.25.') ||
          hostname.startsWith('172.26.') ||
          hostname.startsWith('172.27.') ||
          hostname.startsWith('172.28.') ||
          hostname.startsWith('172.29.') ||
          hostname.startsWith('172.30.') ||
          hostname.startsWith('172.31.') ||
          hostname === '[::1]' ||
          hostname === '::1') {
        return res.status(400).json({ error: 'Invalid URL: Internal/localhost URLs are not allowed' });
      }
    } catch (urlError) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const link = await linkvertiseService.generateLink(req.user.id, targetUrl);
    
    // Create revenue task
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 60); // 1 hour expiry
    
    await RevenueTask.create({
      user_id: req.user.id,
      task_type: 'linkvertise',
      task_id: link.linkId,
      coins_reward: await linkvertiseService.getCoinsReward(),
      expires_at: expiresAt,
    });

    res.json(link);
  } catch (error) {
    next(error);
  }
});

// Complete Linkvertise task
router.post('/linkvertise/complete', [
  body('linkId').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Link ID is required and must be 255 characters or less'),
], validate, async (req, res, next) => {
  try {
    const { linkId } = req.body;
    
    // Find task
    const task = await RevenueTask.findByTaskId(linkId);
    if (!task || task.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({ error: 'Task already completed or expired' });
    }

    // Verify completion
    const verified = await linkvertiseService.verifyCompletion(linkId);
    if (!verified) {
      return res.status(400).json({ error: 'Link completion not verified' });
    }

    // Check cooldown
    const cooldownKey = `linkvertise:cooldown:${req.user.id}`;
    const cooldown = await redis.get(cooldownKey);
    if (cooldown) {
      return res.status(429).json({ error: 'Please wait before completing another link' });
    }

    // Award coins
    await coinService.addCoins(
      req.user.id,
      task.coins_reward,
      'linkvertise',
      `Completed Linkvertise link: ${linkId}`
    );

    // Update task status
    await RevenueTask.updateStatus(task.id, 'completed');

    // Set cooldown
    const cooldownMinutes = await linkvertiseService.getCooldownMinutes();
    await redis.setEx(cooldownKey, cooldownMinutes * 60, '1');

    res.json({ 
      message: 'Coins awarded',
      coins: task.coins_reward 
    });
  } catch (error) {
    next(error);
  }
});

// Start AFK session
router.post('/afk/start', async (req, res, next) => {
  try {
    const session = await afkService.startSession(req.user.id);
    res.json(session);
  } catch (error) {
    next(error);
  }
});

// Update AFK session (minutes are now calculated server-side)
router.post('/afk/update', async (req, res, next) => {
  try {
    // Minutes are now calculated server-side from startTime to prevent manipulation
    const session = await afkService.updateSession(req.user.id);
    res.json(session);
  } catch (error) {
    next(error);
  }
});

// Complete AFK session
router.post('/afk/complete', async (req, res, next) => {
  try {
    const result = await afkService.completeSession(req.user.id);
    
    // Award coins
    if (result.coinsEarned > 0) {
      await coinService.addCoins(
        req.user.id,
        result.coinsEarned,
        'afk',
        `AFK session: ${result.minutes} minutes`
      );
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get AFK session status
router.get('/afk/status', async (req, res, next) => {
  try {
    const status = await afkService.getSessionStatus(req.user.id);
    res.json(status || { active: false });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

