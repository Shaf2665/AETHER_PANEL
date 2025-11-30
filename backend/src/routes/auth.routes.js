const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const { body } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const jwtConfig = require('../config/jwt');
const discordConfig = require('../config/discord');
const redis = require('../config/redis');

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

      // Check if email matches admin email
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
      const userEmail = email.toLowerCase().trim();
      const isAdmin = adminEmail && userEmail === adminEmail;

      // Create user with admin role if email matches
      const user = await User.create({ 
        username, 
        email, 
        password_hash,
        role: isAdmin ? 'admin' : undefined
      });

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
  router.get('/discord', async (req, res) => {
    if (!discordConfig.clientId) {
      return res.status(500).json({ error: 'Discord OAuth not configured' });
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString('hex');
    const stateKey = `discord:oauth:state:${state}`;
    
    // Store state in Redis with 10 minute expiry
    try {
      await redis.setEx(stateKey, 600, '1');
    } catch (error) {
      // If Redis fails, fall back to session (would need express-session)
      // For now, log error but continue (state will be validated on callback)
      console.error('Failed to store OAuth state in Redis:', error);
    }

    const params = new URLSearchParams({
      client_id: discordConfig.clientId,
      redirect_uri: discordConfig.redirectUri,
      response_type: 'code',
      scope: 'identify email',
      state: state, // CSRF protection
    });

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    res.redirect(discordAuthUrl);
  });

  // Discord OAuth callback
  router.get('/discord/callback', async (req, res, next) => {
    try {
      // Validate configuration
      if (!discordConfig.clientId || !discordConfig.clientSecret) {
        console.error('Discord OAuth not properly configured - missing Client ID or Secret');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/login?error=discord_config_error`);
      }
      
      const { code, state } = req.query;

      if (!code) {
        console.error('Discord OAuth callback: Missing authorization code');
        console.error('Query parameters:', req.query);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/login?error=discord_auth_failed&reason=no_code`);
      }

      // Validate CSRF state token
      if (state) {
        const stateKey = `discord:oauth:state:${state}`;
        try {
          const stateExists = await redis.get(stateKey);
          if (!stateExists) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=discord_auth_failed`);
          }
          // Delete state token after use (one-time use)
          await redis.del(stateKey);
        } catch (error) {
          // If Redis fails, log but continue (state validation skipped)
          console.error('Failed to validate OAuth state:', error);
        }
      }

      // Note: Discord already validates redirect_uri, so we don't need to check it here
      // We use FRONTEND_URL environment variable as the source of truth for all redirects

      // Exchange code for access token
      let tokenResponse;
      try {
        tokenResponse = await axios.post(
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
      } catch (tokenError) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Discord token exchange failed:');
        
        if (tokenError.response) {
          // Discord API error
          console.error('  Status:', tokenError.response.status);
          console.error('  Status Text:', tokenError.response.statusText);
          console.error('  Error Data:', JSON.stringify(tokenError.response.data, null, 2));
          
          const errorData = tokenError.response.data;
          if (errorData?.error === 'invalid_grant') {
            console.error('  Reason: Invalid grant - code may be expired or already used');
            console.error('  Solution: User needs to re-authorize');
          } else if (errorData?.error === 'invalid_client') {
            console.error('  Reason: Invalid client - check Client ID and Client Secret');
            console.error('  Solution: Verify Discord OAuth credentials in .env file');
          } else if (errorData?.error === 'invalid_request') {
            console.error('  Reason: Invalid request - check redirect_uri matches Discord Developer Portal');
            console.error('  Current redirect_uri:', discordConfig.redirectUri);
            console.error('  Solution: Ensure redirect URI in Discord Developer Portal exactly matches the above');
          }
        } else if (tokenError.request) {
          // Network error
          console.error('  Network Error:', tokenError.message);
          console.error('  Reason: Could not reach Discord API');
          console.error('  Solution: Check internet connectivity');
        } else {
          // Other error
          console.error('  Error:', tokenError.message);
          console.error('  Stack:', tokenError.stack);
        }
        
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        throw tokenError; // Re-throw to be caught by outer catch
      }

      const { access_token } = tokenResponse.data;

      // Get user info from Discord
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const discordUser = userResponse.data;
      const discordId = discordUser.id;
      const discordEmail = discordUser.email?.toLowerCase().trim(); // Get email from Discord
      const discordUsername = `${discordUser.username}${discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : ''}`;
      const discordAvatar = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
        : null;

      // Check if email matches admin email
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
      const isAdmin = adminEmail && discordEmail && discordEmail === adminEmail;

      // Check if user exists with this Discord ID
      let user = await User.findByDiscordId(discordId);

      if (user) {
        // Update Discord info if changed
        await User.updateDiscordInfo(user.id, discordUsername, discordAvatar);
        
        // Update email if available and user doesn't have one, or if it changed
        if (discordEmail) {
          if (!user.email || user.email.toLowerCase() !== discordEmail) {
            await User.update(user.id, { email: discordEmail });
            // Refresh user data
            user = await User.findById(user.id);
          }
        }
        
        // Update role if email matches admin email
        if (isAdmin && user.role !== 'admin') {
          await User.updateRole(user.id, 'admin');
          // Refresh user data
          user = await User.findById(user.id);
        }
        
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
          email: discordEmail, // Store email from Discord
          discord_id: discordId,
          discord_username: discordUsername,
          discord_avatar: discordAvatar,
          role: isAdmin ? 'admin' : undefined
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
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Discord OAuth callback error:');
      console.error('  Error Type:', error.constructor.name);
      console.error('  Error Message:', error.message);
      
      // Log detailed error information
      if (error.response) {
        // Discord API error
        console.error('  Discord API Error:');
        console.error('    Status:', error.response.status);
        console.error('    Status Text:', error.response.statusText);
        console.error('    Data:', JSON.stringify(error.response.data, null, 2));
        console.error('    URL:', error.config?.url);
      } else if (error.request) {
        // Network error
        console.error('  Network Error:');
        console.error('    Message:', error.message);
        console.error('    Request:', error.request);
      } else {
        // Other error
        console.error('  Error Details:');
        console.error('    Message:', error.message);
        if (error.stack) {
          console.error('    Stack:', error.stack);
        }
      }
      
      // Log current configuration (without secrets)
      console.error('  Current Configuration:');
      console.error('    Client ID:', discordConfig.clientId ? 'SET ✓' : 'MISSING ✗');
      console.error('    Client Secret:', discordConfig.clientSecret ? 'SET ✓' : 'MISSING ✗');
      console.error('    Redirect URI:', discordConfig.redirectUri);
      console.error('    Enabled:', discordConfig.enabled);
      console.error('    Frontend URL:', process.env.FRONTEND_URL || 'NOT SET');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Troubleshooting Steps:');
      console.error('  1. Verify Discord Client ID and Secret in .env file');
      console.error('  2. Check that Redirect URI in Discord Developer Portal matches:');
      console.error(`     ${discordConfig.redirectUri}`);
      console.error('  3. Ensure Redirect URI uses HTTPS in production');
      console.error('  4. Check backend logs above for specific error details');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=discord_auth_failed`);
    }
  });
} else {
  // Discord routes when not enabled - return proper error messages
  router.get('/discord', (req, res) => {
    res.status(503).json({
      error: 'Discord authentication is not enabled',
      message: 'Please contact the administrator to enable Discord authentication'
    });
  });

  router.get('/discord/callback', (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?error=discord_not_enabled`);
  });
}

module.exports = router;

