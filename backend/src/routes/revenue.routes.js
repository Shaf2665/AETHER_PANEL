const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const linkvertiseService = require('../services/linkvertise.service');
const afkService = require('../services/afk.service');
const coinService = require('../services/coin.service');
const RevenueTask = require('../models/RevenueTask');
const redis = require('../config/redis');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

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
router.post('/linkvertise/generate', async (req, res, next) => {
  try {
    const { targetUrl } = req.body;
    const link = await linkvertiseService.generateLink(req.user.id, targetUrl);
    
    // Create revenue task
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 60); // 1 hour expiry
    
    await RevenueTask.create({
      user_id: req.user.id,
      task_type: 'linkvertise',
      task_id: link.linkId,
      coins_reward: linkvertiseService.getCoinsReward(),
      expires_at: expiresAt,
    });

    res.json(link);
  } catch (error) {
    next(error);
  }
});

// Complete Linkvertise task
router.post('/linkvertise/complete', async (req, res, next) => {
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
    const cooldownMinutes = linkvertiseService.getCooldownMinutes();
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

