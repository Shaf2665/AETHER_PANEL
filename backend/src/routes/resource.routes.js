const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get resource pricing
router.get('/pricing', (req, res) => {
  res.json({
    cpu: {
      per_core: 100,
      per_hour: 5,
    },
    memory: {
      per_gb: 200,
      per_hour: 10,
    },
    disk: {
      per_gb: 50,
      per_hour: 2,
    },
  });
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

