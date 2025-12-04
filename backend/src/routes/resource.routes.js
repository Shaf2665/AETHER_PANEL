const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const Settings = require('../models/Settings');
const ServerTemplate = require('../models/ServerTemplate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get resource pricing
router.get('/pricing', async (req, res, next) => {
  try {
    const pricing = await Settings.getResourcePricing();
    res.json(pricing);
  } catch (error) {
    console.error('Error fetching resource pricing:', error);
    // Return defaults on error
    res.json({
      cpu: { per_core: 100, per_hour: 5 },
      memory: { per_gb: 200, per_hour: 10 },
      disk: { per_gb: 50, per_hour: 2 },
    });
  }
});

// Get enabled server templates (public store endpoint)
router.get('/templates', async (req, res, next) => {
  try {
    const templates = await ServerTemplate.findAll(true); // enabledOnly = true
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

// Purchase resources (placeholder)
router.post('/purchase', async (req, res, next) => {
  try {
    // Implementation would:
    // 1. Calculate cost based on resources
    // 2. Check user has enough coins
    // 3. Deduct coins
    // 4. Allocate resources to server
    res.json({ message: 'Resource purchase endpoint - implementation needed' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

