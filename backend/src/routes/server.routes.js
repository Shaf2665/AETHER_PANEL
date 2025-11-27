const express = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const Server = require('../models/Server');
const pterodactylService = require('../services/pterodactyl.service');
const coinService = require('../services/coin.service');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user's servers
router.get('/', async (req, res, next) => {
  try {
    const servers = await Server.findByUserId(req.user.id);
    res.json(servers);
  } catch (error) {
    next(error);
  }
});

// Get single server
router.get('/:id', 
  [
    param('id').isUUID().withMessage('Invalid server ID format'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const server = await Server.findById(req.params.id);
      if (!server || server.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Server not found' });
      }
      res.json(server);
    } catch (error) {
      next(error);
    }
  }
);

// Create server (placeholder - will need proper implementation)
router.post(
  '/create',
  [
    body('name').trim().isLength({ min: 1, max: 50 }),
    body('game_type').isIn(['minecraft', 'fivem', 'other']),
    body('cpu_limit').isInt({ min: 1 }),
    body('memory_limit').isInt({ min: 512 }),
    body('disk_limit').isInt({ min: 1024 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      // This is a placeholder - actual implementation would:
      // 1. Calculate cost based on resources
      // 2. Check user has enough coins
      // 3. Create server in Pterodactyl
      // 4. Save to database
      // 5. Deduct coins

      res.json({ message: 'Server creation endpoint - implementation needed' });
    } catch (error) {
      next(error);
    }
  }
);

// Update server resources
router.put(
  '/:id/resources',
  [
    param('id').isUUID().withMessage('Invalid server ID format'),
    body('cpu_limit').optional().isInt({ min: 1 }),
    body('memory_limit').optional().isInt({ min: 512 }),
    body('disk_limit').optional().isInt({ min: 1024 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const server = await Server.findById(req.params.id);
      if (!server || server.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Server not found' });
      }

      // Update resources (placeholder - would calculate cost and deduct coins)
      const updated = await Server.updateResources(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// Delete server
router.delete('/:id',
  [
    param('id').isUUID().withMessage('Invalid server ID format'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const server = await Server.findById(req.params.id);
      if (!server || server.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Server not found' });
      }

      // Delete from Pterodactyl
      if (server.pterodactyl_server_id) {
        await pterodactylService.deleteServer(server.pterodactyl_server_id);
      }

      // Mark as deleted in database
      await Server.delete(req.params.id);
      res.json({ message: 'Server deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

