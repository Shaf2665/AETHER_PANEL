const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const coinService = require('../services/coin.service');
const { validatePagination } = require('../utils/pagination');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get coin balance
router.get('/balance', async (req, res, next) => {
  try {
    const balance = await coinService.getBalance(req.user.id);
    res.json(balance);
  } catch (error) {
    next(error);
  }
});

// Get transaction history
router.get('/transactions', async (req, res, next) => {
  try {
    // Validate and limit pagination parameters to prevent DoS
    const { limit, offset } = validatePagination(req.query.limit, req.query.offset);
    const transactions = await coinService.getTransactions(req.user.id, limit, offset);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

