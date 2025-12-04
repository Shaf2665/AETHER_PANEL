const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const User = require('../models/User');
const Server = require('../models/Server');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const ServerTemplate = require('../models/ServerTemplate');
const coinService = require('../services/coin.service');
const pterodactylConfig = require('../config/pterodactyl');
const pool = require('../config/database');
const updateService = require('../services/update.service');
const { updateRateLimit } = require('../middleware/updateRateLimit.middleware');
const { storeRateLimit } = require('../middleware/storeRateLimit.middleware');
const { validateIcon, getAllowedIcons } = require('../utils/iconValidator');
const { validateGradientColors } = require('../utils/colorValidator');

const router = express.Router();

// All routes require admin access
router.use(requireAdmin);

// Get system statistics
router.get('/stats', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Total users
      const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
      const totalUsers = parseInt(usersResult.rows[0].count);

      // Total admins
      const adminsResult = await client.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
      const totalAdmins = parseInt(adminsResult.rows[0].count);

      // Total servers
      const serversResult = await client.query("SELECT COUNT(*) as count FROM servers WHERE status != 'deleted'");
      const totalServers = parseInt(serversResult.rows[0].count);

      // Total coins in circulation
      const coinsResult = await client.query('SELECT COALESCE(SUM(coins), 0) as total FROM users');
      const totalCoins = parseFloat(coinsResult.rows[0].total);

      // Total coins earned (all time)
      const earnedResult = await client.query('SELECT COALESCE(SUM(total_earned_coins), 0) as total FROM users');
      const totalEarned = parseFloat(earnedResult.rows[0].total);

      // Active users (last 24 hours)
      const active24hResult = await client.query(
        "SELECT COUNT(*) as count FROM users WHERE last_active >= NOW() - INTERVAL '24 hours'"
      );
      const active24h = parseInt(active24hResult.rows[0].count);

      // Active users (last 7 days)
      const active7dResult = await client.query(
        "SELECT COUNT(*) as count FROM users WHERE last_active >= NOW() - INTERVAL '7 days'"
      );
      const active7d = parseInt(active7dResult.rows[0].count);

      // New registrations (today)
      const newTodayResult = await client.query(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE"
      );
      const newToday = parseInt(newTodayResult.rows[0].count);

      // New registrations (this week)
      const newWeekResult = await client.query(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'"
      );
      const newWeek = parseInt(newWeekResult.rows[0].count);

      // New registrations (this month)
      const newMonthResult = await client.query(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'"
      );
      const newMonth = parseInt(newMonthResult.rows[0].count);

      // Servers by game type
      const serversByTypeResult = await client.query(
        "SELECT game_type, COUNT(*) as count FROM servers WHERE status != 'deleted' GROUP BY game_type"
      );
      const serversByType = serversByTypeResult.rows.reduce((acc, row) => {
        acc[row.game_type] = parseInt(row.count);
        return acc;
      }, {});

      // Revenue statistics
      const revenueResult = await client.query(`
        SELECT 
          source,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total
        FROM transactions 
        WHERE type = 'earned'
        GROUP BY source
        ORDER BY total DESC
      `);
      const revenueBySource = revenueResult.rows.map(row => ({
        source: row.source,
        count: parseInt(row.count),
        total: parseFloat(row.total)
      }));

      res.json({
        users: {
          total: totalUsers,
          admins: totalAdmins,
          regular: totalUsers - totalAdmins,
          active24h,
          active7d,
          newToday,
          newWeek,
          newMonth
        },
        servers: {
          total: totalServers,
          byType: serversByType
        },
        coins: {
          inCirculation: totalCoins,
          totalEarned: totalEarned
        },
        revenue: {
          bySource: revenueBySource
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Get all users with pagination
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString().trim(),
  query('role').optional().isIn(['user', 'admin']),
  validate
], async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const roleFilter = req.query.role || '';

    const result = await User.findAll(page, limit, search, roleFilter);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get user details
router.get('/users/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's servers
    const servers = await Server.findByUserId(user.id);

    // Get user's recent transactions
    const transactions = await Transaction.findByUserId(user.id, 10, 0);

    res.json({
      ...user,
      servers,
      recentTransactions: transactions
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/users/:id', [
  param('id').isUUID(),
  body('username').optional().trim().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['user', 'admin']),
  body('coins').optional().isFloat({ min: 0 }),
  validate
], async (req, res, next) => {
  try {
    const user = await User.update(req.params.id, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/users/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const user = await User.delete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully', user });
  } catch (error) {
    next(error);
  }
});

// Manually adjust user coins
router.post('/users/:id/coins', [
  param('id').isUUID(),
  body('amount').isFloat({ min: -1000000, max: 1000000 }).withMessage('Amount must be between -1,000,000 and 1,000,000'),
  body('description').optional().isString().trim().isLength({ max: 500 }).withMessage('Description must be 500 characters or less'),
  validate
], async (req, res, next) => {
  try {
    const { amount, description } = req.body;
    const userId = req.params.id;
    
    // Additional validation: Prevent setting negative balance
    if (amount < 0) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const currentBalance = parseFloat(user.coins) || 0;
      if (Math.abs(amount) > currentBalance) {
        return res.status(400).json({ 
          error: 'Cannot set user balance below zero',
          currentBalance,
          requestedAdjustment: amount
        });
      }
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Adjust coins (use addCoins which handles both positive and negative amounts)
    await coinService.addCoins(userId, amount, 'admin_adjustment', description || `Admin adjustment: ${amount > 0 ? '+' : ''}${amount} coins`);

    // Get updated user
    const updatedUser = await User.findById(userId);

    res.json({
      message: 'Coins adjusted successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// Get all servers
router.get('/servers', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('userId').optional().isUUID(),
  query('gameType').optional().isIn(['minecraft', 'fivem', 'other']).withMessage('Invalid game type'),
  query('status').optional().isIn(['active', 'suspended', 'deleted']).withMessage('Invalid status'),
  validate
], async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const userId = req.query.userId || null;
    const gameType = req.query.gameType || null;
    const status = req.query.status || null;

    const result = await Server.findAll(page, limit, userId, gameType, status);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get all transactions
router.get('/transactions', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('userId').optional().isUUID(),
  query('type').optional().isIn(['earned', 'spent', 'refunded']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validate
], async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const userId = req.query.userId || null;
    const type = req.query.type || null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    const result = await Transaction.findAll(page, limit, userId, type, startDate, endDate);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get revenue analytics
router.get('/revenue', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Total revenue
      const totalResult = await client.query(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM transactions 
        WHERE type = 'earned'
      `);
      const totalRevenue = parseFloat(totalResult.rows[0].total);

      // Revenue by source
      const bySourceResult = await client.query(`
        SELECT 
          source,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total
        FROM transactions 
        WHERE type = 'earned'
        GROUP BY source
        ORDER BY total DESC
      `);
      const revenueBySource = bySourceResult.rows.map(row => ({
        source: row.source,
        count: parseInt(row.count),
        total: parseFloat(row.total)
      }));

      // Daily revenue (last 30 days)
      const dailyResult = await client.query(`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(amount), 0) as total
        FROM transactions 
        WHERE type = 'earned' AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);
      const dailyRevenue = dailyResult.rows.map(row => ({
        date: row.date,
        total: parseFloat(row.total)
      }));

      // Top earners
      const topEarnersResult = await client.query(`
        SELECT 
          u.id,
          u.username,
          u.email,
          COALESCE(SUM(t.amount), 0) as total_earned
        FROM users u
        LEFT JOIN transactions t ON u.id = t.user_id AND t.type = 'earned'
        GROUP BY u.id, u.username, u.email
        ORDER BY total_earned DESC
        LIMIT 10
      `);
      const topEarners = topEarnersResult.rows.map(row => ({
        id: row.id,
        username: row.username,
        email: row.email,
        totalEarned: parseFloat(row.total_earned)
      }));

      res.json({
        total: totalRevenue,
        bySource: revenueBySource,
        daily: dailyRevenue,
        topEarners
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Get Pterodactyl settings
router.get('/settings/pterodactyl', async (req, res, next) => {
  try {
    await pterodactylConfig.refresh(); // Refresh cache
    const config = await Settings.getPterodactylConfig();
    res.json(config);
  } catch (error) {
    next(error);
  }
});

// Update Pterodactyl settings
router.put('/settings/pterodactyl', [
  body('url').optional().isURL().withMessage('Invalid URL'),
  body('apiKey').optional().isString(),
  body('clientApiKey').optional().isString(),
  body('applicationApiKey').optional().isString(),
  body('nodeId').optional().isInt({ min: 1 }),
  body('nestId').optional().isInt({ min: 1 }),
  body('eggIdMinecraft').optional().isInt({ min: 1 }),
  body('eggIdFivem').optional().isInt({ min: 1 }),
  body('eggIdOther').optional().isInt({ min: 1 }),
  body('defaultUserId').optional().isInt({ min: 1 }),
  validate
], async (req, res, next) => {
  try {
    const updates = req.body;
    
    if (updates.url !== undefined) await Settings.set('pterodactyl_url', updates.url);
    if (updates.apiKey !== undefined) await Settings.set('pterodactyl_api_key', updates.apiKey);
    if (updates.clientApiKey !== undefined) await Settings.set('pterodactyl_client_api_key', updates.clientApiKey);
    if (updates.applicationApiKey !== undefined) await Settings.set('pterodactyl_application_api_key', updates.applicationApiKey);
    if (updates.nodeId !== undefined) await Settings.set('pterodactyl_node_id', updates.nodeId.toString());
    if (updates.nestId !== undefined) await Settings.set('pterodactyl_nest_id', updates.nestId.toString());
    if (updates.eggIdMinecraft !== undefined) await Settings.set('pterodactyl_egg_id_minecraft', updates.eggIdMinecraft.toString());
    if (updates.eggIdFivem !== undefined) await Settings.set('pterodactyl_egg_id_fivem', updates.eggIdFivem.toString());
    if (updates.eggIdOther !== undefined) await Settings.set('pterodactyl_egg_id_other', updates.eggIdOther.toString());
    if (updates.defaultUserId !== undefined) await Settings.set('pterodactyl_default_user_id', updates.defaultUserId.toString());

    // Clear cache to force refresh
    pterodactylConfig.clearCache();
    await pterodactylConfig.refresh();

    const updatedConfig = await Settings.getPterodactylConfig();
    res.json({ message: 'Settings updated successfully', config: updatedConfig });
  } catch (error) {
    next(error);
  }
});

// Get Linkvertise settings
router.get('/settings/linkvertise', async (req, res, next) => {
  try {
    const revenueConfig = require('../config/revenue');
    revenueConfig.clearLinkvertiseCache(); // Clear cache to get latest
    const config = await Settings.getLinkvertiseConfig();
    res.json(config);
  } catch (error) {
    next(error);
  }
});

// Update Linkvertise settings
router.put('/settings/linkvertise', [
  body('enabled').optional().isBoolean(),
  body('apiKey').optional().isString(),
  body('coinsPerCompletion').optional().isInt({ min: 1 }).withMessage('Coins per completion must be at least 1'),
  body('cooldownMinutes').optional().isInt({ min: 1 }).withMessage('Cooldown minutes must be at least 1'),
  body('manualMode').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const updates = req.body;
    
    if (updates.enabled !== undefined) await Settings.set('linkvertise_enabled', updates.enabled.toString());
    if (updates.apiKey !== undefined) await Settings.set('linkvertise_api_key', updates.apiKey || '');
    if (updates.coinsPerCompletion !== undefined) await Settings.set('linkvertise_coins_per_completion', updates.coinsPerCompletion.toString());
    if (updates.cooldownMinutes !== undefined) await Settings.set('linkvertise_cooldown_minutes', updates.cooldownMinutes.toString());
    if (updates.manualMode !== undefined) await Settings.set('linkvertise_manual_mode', updates.manualMode.toString());

    // Clear cache to force refresh
    const revenueConfig = require('../config/revenue');
    revenueConfig.clearLinkvertiseCache();

    const updatedConfig = await Settings.getLinkvertiseConfig();
    res.json({ message: 'Linkvertise settings updated successfully', config: updatedConfig });
  } catch (error) {
    next(error);
  }
});

// Theme Settings Routes

// Get theme configuration
router.get('/settings/theme', async (req, res, next) => {
  try {
    const themeConfig = await Settings.getThemeConfig();
    res.json(themeConfig);
  } catch (error) {
    next(error);
  }
});

// Update theme configuration
router.put(
  '/settings/theme',
  [
    body('colors').optional().isObject(),
    body('colors.primary').optional().isString(),
    body('colors.secondary').optional().isString(),
    body('colors.sidebarBg').optional().isString(),
    body('colors.sidebarText').optional().isString(),
    body('colors.sidebarHover').optional().isString(),
    body('colors.navActive').optional().isString(),
    body('colors.background').optional().isString(),
    body('colors.cardBg').optional().isString(),
    body('colors.textPrimary').optional().isString(),
    body('colors.textSecondary').optional().isString(),
    body('navigation').optional().isObject(),
    body('navigation.dashboard').optional().isString(),
    body('navigation.servers').optional().isString(),
    body('navigation.earnCoins').optional().isString(),
    body('navigation.store').optional().isString(),
    body('navigation.admin').optional().isString(),
    body('background').optional().isObject(),
    body('background.image').optional().isString(),
    body('background.overlay').optional().isString(),
    body('background.position').optional().isString(),
    body('background.size').optional().isString(),
    body('background.repeat').optional().isString(),
    body('customCSS').optional().isString().isLength({ max: 10000 }),
    validate
  ],
  async (req, res, next) => {
    try {
      const updates = req.body;
      
      // Get current config
      const currentConfig = await Settings.getThemeConfig();
      
      // Merge updates
      const updatedConfig = {
        colors: { ...currentConfig.colors, ...(updates.colors || {}) },
        navigation: { ...currentConfig.navigation, ...(updates.navigation || {}) },
        background: { ...currentConfig.background, ...(updates.background || {}) },
        customCSS: updates.customCSS !== undefined ? updates.customCSS : currentConfig.customCSS,
      };
      
      // Save updated config
      await Settings.setThemeConfig(updatedConfig);
      
      res.json({ 
        message: 'Theme settings updated successfully', 
        config: updatedConfig 
      });
    } catch (error) {
      next(error);
    }
  }
);

// Branding Settings Routes

// Get branding configuration
router.get('/settings/branding', async (req, res, next) => {
  try {
    const brandingConfig = await Settings.getBrandingConfig();
    res.json(brandingConfig);
  } catch (error) {
    next(error);
  }
});

// Update branding configuration
router.put(
  '/settings/branding',
  [
    body('dashboardName').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Dashboard name must be between 1 and 100 characters'),
    body('dashboardShortName').optional().isString().isLength({ min: 1, max: 50 }).withMessage('Short name must be between 1 and 50 characters'),
    body('sidebarLogoUrl').optional().isString(),
    body('mainLogoUrl').optional().isString(),
    validate
  ],
  async (req, res, next) => {
    try {
      const updates = req.body;
      
      // Validate logo URLs if provided (must be data URLs or valid URLs)
      if (updates.sidebarLogoUrl !== undefined && updates.sidebarLogoUrl !== '') {
        // Stricter data URL validation: data:image/(jpeg|jpg|png|gif|webp|svg+xml);base64,...
        const isValidDataUrl = /^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(updates.sidebarLogoUrl);
        // Valid HTTP(S) URL validation
        const isValidUrl = /^https?:\/\/.+/.test(updates.sidebarLogoUrl);
        if (!isValidDataUrl && !isValidUrl) {
          return res.status(400).json({
            error: 'Invalid sidebar logo URL',
            message: 'Logo URL must be a valid data URL (data:image/jpeg;base64,...) or HTTP(S) URL'
          });
        }
      }
      
      if (updates.mainLogoUrl !== undefined && updates.mainLogoUrl !== '') {
        // Stricter data URL validation: data:image/(jpeg|jpg|png|gif|webp|svg+xml);base64,...
        const isValidDataUrl = /^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(updates.mainLogoUrl);
        // Valid HTTP(S) URL validation
        const isValidUrl = /^https?:\/\/.+/.test(updates.mainLogoUrl);
        if (!isValidDataUrl && !isValidUrl) {
          return res.status(400).json({
            error: 'Invalid main logo URL',
            message: 'Logo URL must be a valid data URL (data:image/jpeg;base64,...) or HTTP(S) URL'
          });
        }
      }
      
      // Update branding config
      await Settings.setBrandingConfig(updates);
      
      const updatedConfig = await Settings.getBrandingConfig();
      res.json({ 
        message: 'Branding settings updated successfully', 
        config: updatedConfig 
      });
    } catch (error) {
      next(error);
    }
  }
);

// System Update Routes

// Get update status
router.get('/system/update/status', async (req, res, next) => {
  try {
    const status = await updateService.getStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

// Get update logs
router.get('/system/update/logs', async (req, res, next) => {
  try {
    const logs = updateService.getLogs();
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

// Perform system update
router.post('/system/update', updateRateLimit, async (req, res, next) => {
  try {
    // Check feature flag
    if (process.env.ENABLE_SYSTEM_UPDATE !== 'true') {
      return res.status(403).json({
        error: 'System updates are disabled',
        message: 'Set ENABLE_SYSTEM_UPDATE=true in your .env file to enable system updates.'
      });
    }

    // Check if update already in progress
    const status = await updateService.getStatus();
    if (status.isUpdating) {
      return res.status(409).json({
        error: 'Update already in progress',
        message: 'Please wait for the current update to complete.'
      });
    }

    // Perform update asynchronously
    const userId = req.user.id;
    
    // Start update in background (don't await)
    updateService.performUpdate(userId).catch(error => {
      console.error('Update failed:', error);
    });

    // Return immediate response
    res.json({
      message: 'Update started',
      status: 'in_progress'
    });
    } catch (error) {
    next(error);
  }
});

// Store Management Routes

// Get resource pricing
router.get('/store/pricing', async (req, res, next) => {
  try {
    const pricing = await Settings.getResourcePricing();
    res.json(pricing);
  } catch (error) {
    next(error);
  }
});

// Update resource pricing
router.put(
  '/store/pricing',
  storeRateLimit,
  [
    body('cpu.per_core').optional().isFloat({ min: 0.01, max: 10000 }),
    body('cpu.per_hour').optional().isFloat({ min: 0.01, max: 1000 }),
    body('memory.per_gb').optional().isFloat({ min: 0.01, max: 10000 }),
    body('memory.per_hour').optional().isFloat({ min: 0.01, max: 1000 }),
    body('disk.per_gb').optional().isFloat({ min: 0.01, max: 10000 }),
    body('disk.per_hour').optional().isFloat({ min: 0.01, max: 1000 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      await Settings.setResourcePricing(req.body);
      const updatedPricing = await Settings.getResourcePricing();
      res.json(updatedPricing);
    } catch (error) {
      next(error);
    }
  }
);

// Get all server templates
router.get('/store/templates', async (req, res, next) => {
  try {
    const templates = await ServerTemplate.findAll();
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

// Get single server template
router.get('/store/templates/:id', [param('id').isUUID()], validate, async (req, res, next) => {
  try {
    const template = await ServerTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    next(error);
  }
});

// Create server template
router.post(
  '/store/templates',
  storeRateLimit,
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('cpu_cores').isInt({ min: 1, max: 100 }),
    body('ram_gb').isInt({ min: 1, max: 1000 }),
    body('disk_gb').isInt({ min: 1, max: 10000 }),
    body('price').isFloat({ min: 0.01, max: 1000000 }),
    body('game_type').isIn(['minecraft', 'fivem', 'other']),
    body('enabled').optional().isBoolean(),
    body('icon').trim().isLength({ min: 1 }),
    body('gradient_colors').isObject(),
    body('display_order').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      // Validate icon
      if (!validateIcon(req.body.icon)) {
        return res.status(400).json({ error: 'Invalid icon name. Icon must be from the allowed whitelist.' });
      }

      // Validate gradient colors
      const gradientValidation = validateGradientColors(req.body.gradient_colors);
      if (!gradientValidation.valid) {
        return res.status(400).json({ error: gradientValidation.error });
      }

      // Use sanitized gradient colors
      req.body.gradient_colors = gradientValidation.sanitized;

      const template = await ServerTemplate.create(req.body);
      res.status(201).json(template);
    } catch (error) {
      next(error);
    }
  }
);

// Update server template
router.put(
  '/store/templates/:id',
  storeRateLimit,
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('cpu_cores').optional().isInt({ min: 1, max: 100 }),
    body('ram_gb').optional().isInt({ min: 1, max: 1000 }),
    body('disk_gb').optional().isInt({ min: 1, max: 10000 }),
    body('price').optional().isFloat({ min: 0.01, max: 1000000 }),
    body('game_type').optional().isIn(['minecraft', 'fivem', 'other']),
    body('enabled').optional().isBoolean(),
    body('icon').optional().trim().isLength({ min: 1 }),
    body('gradient_colors').optional().isObject(),
    body('display_order').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      // Validate icon if provided
      if (req.body.icon && !validateIcon(req.body.icon)) {
        return res.status(400).json({ error: 'Invalid icon name. Icon must be from the allowed whitelist.' });
      }

      // Validate gradient colors if provided
      if (req.body.gradient_colors) {
        const gradientValidation = validateGradientColors(req.body.gradient_colors);
        if (!gradientValidation.valid) {
          return res.status(400).json({ error: gradientValidation.error });
        }
        req.body.gradient_colors = gradientValidation.sanitized;
      }

      const template = await ServerTemplate.update(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json(template);
    } catch (error) {
      next(error);
    }
  }
);

// Delete server template
router.delete('/store/templates/:id', storeRateLimit, [param('id').isUUID()], validate, async (req, res, next) => {
  try {
    // Check if template is in use
    const isInUse = await ServerTemplate.checkTemplateUsage(req.params.id);
    if (isInUse) {
      return res.status(400).json({
        error: 'Cannot delete template',
        message: 'This template is currently in use by one or more servers. Please remove or update those servers first.',
      });
    }

    const deleted = await ServerTemplate.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Reorder server templates
router.put(
  '/store/templates/reorder',
  storeRateLimit,
  [
    body('templates').isArray({ min: 1 }),
    body('templates.*.id').isUUID(),
    body('templates.*.display_order').isInt({ min: 0 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const templates = await ServerTemplate.reorder(req.body.templates);
      res.json(templates);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

