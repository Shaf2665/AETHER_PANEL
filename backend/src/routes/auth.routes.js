const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { body } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const jwtConfig = require('../config/jwt');
const discordConfig = require('../config/discord');

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
          role: user.role || 'user',
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
          role: user.role || 'user',
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
      role: user.role || 'user',
      discordId: user.discord_id,
      discordUsername: user.discord_username,
      coins: user.coins,
      totalEarnedCoins: user.total_earned_coins,
      createdAt: user.created_at,
    });
  } catch (error) {
    next(error);
  }
});

// Discord OAuth Routes
if (discordConfig.enabled) {
  // Initiate Discord OAuth flow
  router.get('/discord', (req, res) => {
    if (!discordConfig.clientId) {
      return res.status(500).json({ error: 'Discord OAuth not configured' });
    }

    const params = new URLSearchParams({
      client_id: discordConfig.clientId,
      redirect_uri: discordConfig.redirectUri,
      response_type: 'code',
      scope: 'identify email',
    });

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    res.redirect(discordAuthUrl);
  });

  // Discord OAuth callback
  router.get('/discord/callback', async (req, res, next) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=discord_auth_failed`);
      }

      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://discord.com/api/oauth2/token',
        new URLSearchParams({
          client_id: discordConfig.clientId,
          client_secret: discordConfig.clientSecret,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: discordConfig.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token } = tokenResponse.data;

      // Get user info from Discord
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const discordUser = userResponse.data;
      const discordId = discordUser.id;
      const discordUsername = `${discordUser.username}${discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : ''}`;
      const discordAvatar = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
        : null;

      // Check if user exists with this Discord ID
      let user = await User.findByDiscordId(discordId);

      if (user) {
        // Update Discord info if changed
        await User.updateDiscordInfo(user.id, discordUsername, discordAvatar);
        await User.updateLastActive(user.id);
      } else {
        // Create new user with Discord
        // Generate username from Discord username (remove # and special chars)
        const username = discordUser.username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().substring(0, 20) || `discord_${discordId.substring(0, 10)}`;
        
        // Ensure username is unique
        let finalUsername = username;
        let counter = 1;
        while (await User.findByUsername(finalUsername)) {
          finalUsername = `${username}${counter}`;
          counter++;
        }

        user = await User.create({
          username: finalUsername,
          discord_id: discordId,
          discord_username: discordUsername,
          discord_avatar: discordAvatar,
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Discord OAuth error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=discord_auth_failed`);
    }
  });
}

module.exports = router;

