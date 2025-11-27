const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const jwtConfig = require('../config/jwt');

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { username, email, password } = req.body;

      // Check if user exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ error: 'Username already taken' });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({ username, email, password_hash });

      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          coins: user.coins,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last active
      await User.updateLastActive(user.id);

      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          coins: user.coins,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      coins: user.coins,
      totalEarnedCoins: user.total_earned_coins,
      createdAt: user.created_at,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

