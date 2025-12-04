const express = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const Server = require('../models/Server');
const Settings = require('../models/Settings');
const pterodactylService = require('../services/pterodactyl.service');
const coinService = require('../services/coin.service');
const pterodactylConfig = require('../config/pterodactyl');
const pool = require('../config/database');

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

// Helper function to calculate server creation cost
async function calculateServerCost(cpuLimit, memoryLimit, diskLimit) {
  try {
    // Get pricing from Settings
    const pricing = await Settings.getResourcePricing();
    
    // CPU: per_core coins per core (assuming 1 core = 100%)
    const cpuCost = Math.ceil(cpuLimit / 100) * pricing.cpu.per_core;
    
    // Memory: per_gb coins per GB (convert MB to GB)
    const memoryCost = Math.ceil(memoryLimit / 1024) * pricing.memory.per_gb;
    
    // Disk: per_gb coins per GB (convert MB to GB)
    const diskCost = Math.ceil(diskLimit / 1024) * pricing.disk.per_gb;
    
    // Base creation fee
    const baseFee = 500;
    
    return cpuCost + memoryCost + diskCost + baseFee;
  } catch (error) {
    console.error('Error calculating server cost:', error);
    // Fallback to default pricing
    const cpuCost = Math.ceil(cpuLimit / 100) * 100;
    const memoryCost = Math.ceil(memoryLimit / 1024) * 200;
    const diskCost = Math.ceil(diskLimit / 1024) * 50;
    const baseFee = 500;
    return cpuCost + memoryCost + diskCost + baseFee;
  }
}

// Helper function to calculate resource upgrade cost
async function calculateResourceUpgradeCost(oldResources, newResources) {
  try {
    // Get pricing from Settings
    const pricing = await Settings.getResourcePricing();
    
    let cost = 0;
    
    // Calculate CPU upgrade cost
    if (newResources.cpu_limit > oldResources.cpu_limit) {
      const cpuDiff = newResources.cpu_limit - oldResources.cpu_limit;
      cost += Math.ceil(cpuDiff / 100) * pricing.cpu.per_core;
    }
    
    // Calculate memory upgrade cost
    if (newResources.memory_limit > oldResources.memory_limit) {
      const memoryDiff = newResources.memory_limit - oldResources.memory_limit;
      cost += Math.ceil(memoryDiff / 1024) * pricing.memory.per_gb;
    }
    
    // Calculate disk upgrade cost
    if (newResources.disk_limit > oldResources.disk_limit) {
      const diskDiff = newResources.disk_limit - oldResources.disk_limit;
      cost += Math.ceil(diskDiff / 1024) * pricing.disk.per_gb;
    }
    
    // Downgrades are free (no refund, just allow)
    return cost;
  } catch (error) {
    console.error('Error calculating resource upgrade cost:', error);
    // Fallback to default pricing
    let cost = 0;
    if (newResources.cpu_limit > oldResources.cpu_limit) {
      const cpuDiff = newResources.cpu_limit - oldResources.cpu_limit;
      cost += Math.ceil(cpuDiff / 100) * 100;
    }
    if (newResources.memory_limit > oldResources.memory_limit) {
      const memoryDiff = newResources.memory_limit - oldResources.memory_limit;
      cost += Math.ceil(memoryDiff / 1024) * 200;
    }
    if (newResources.disk_limit > oldResources.disk_limit) {
      const diskDiff = newResources.disk_limit - oldResources.disk_limit;
      cost += Math.ceil(diskDiff / 1024) * 50;
    }
    return cost;
  }
}

// Create server
router.post(
  '/create',
  [
    body('name').trim().isLength({ min: 1, max: 50 }),
    body('game_type').custom((value) => {
      // Validate game_type dynamically
      if (value === 'minecraft') {
        return Promise.resolve(true);
      }
      // Check if it's a custom game (sync check using cached config)
      const customGames = pterodactylConfig.customGames || [];
      const customGameNames = customGames.map(g => g.name.toLowerCase());
      if (customGameNames.includes(value.toLowerCase())) {
        return Promise.resolve(true);
      }
      return Promise.reject(new Error(`Invalid game type. Must be 'minecraft' or one of the configured custom games.`));
    }),
    body('cpu_limit').isInt({ min: 1, max: 1000 }).withMessage('CPU limit must be between 1 and 1000'),
    body('memory_limit').isInt({ min: 512, max: 32768 }).withMessage('Memory limit must be between 512MB and 32768MB'),
    body('disk_limit').isInt({ min: 1024, max: 1000000 }).withMessage('Disk limit must be between 1024MB and 1000000MB'),
  ],
  validate,
  async (req, res, next) => {
    const client = await pool.connect();
    
    try {
      const { name, game_type, cpu_limit, memory_limit, disk_limit } = req.body;
      
      // Check server count limit (max 20 servers per user)
      const existingServers = await Server.findByUserId(req.user.id);
      const MAX_SERVERS_PER_USER = parseInt(process.env.MAX_SERVERS_PER_USER || '20');
      if (existingServers.length >= MAX_SERVERS_PER_USER) {
        return res.status(400).json({ 
          error: `Maximum server limit reached (${MAX_SERVERS_PER_USER} servers per user)` 
        });
      }
      
      // Calculate server creation cost
      const cost = await calculateServerCost(cpu_limit, memory_limit, disk_limit);
      
      // Check user balance
      const balance = await coinService.getBalance(req.user.id);
      if (balance.coins < cost) {
        return res.status(400).json({ 
          error: 'Insufficient coins', 
          required: cost, 
          available: balance.coins 
        });
      }
      
      await client.query('BEGIN');
      
      try {
        // Refresh config to get latest custom games
        await pterodactylConfig.refresh();
        
        // Get Pterodactyl user ID
        // Note: In production, you should create/sync users in Pterodactyl when they register
        // For now, using environment variable or defaulting to user ID
        // This should be the Pterodactyl user ID (integer), not our UUID
        const pterodactylUserId = parseInt(process.env.PTERODACTYL_DEFAULT_USER_ID || '1');
        
        // Determine nest ID and egg ID based on game type
        let nestId, eggId, startup;
        
        if (game_type === 'minecraft') {
          // Minecraft uses default nest ID and Minecraft egg ID
          nestId = pterodactylConfig.defaultNestId;
          eggId = pterodactylConfig.gameTypeEggs.minecraft;
          startup = 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}';
        } else {
          // Find custom game
          const customGames = pterodactylConfig.customGames || [];
          const customGame = customGames.find(g => g.name.toLowerCase() === game_type.toLowerCase());
          
          if (!customGame) {
            throw new Error(`Custom game '${game_type}' not found. Please configure it in Admin Panel > Settings > Pterodactyl Configuration.`);
          }
          
          nestId = customGame.nestId;
          eggId = customGame.eggId;
          startup = ''; // Custom games may have their own startup commands
        }
        
        // Create server in Pterodactyl
        const pterodactylServer = await pterodactylService.createServer({
          name,
          userId: pterodactylUserId,
          description: `${game_type} server for ${req.user.username}`,
          cpu: cpu_limit,
          memory: memory_limit,
          disk: disk_limit,
          io: 500,
          swap: 0,
          nodeId: pterodactylConfig.defaultNodeId,
          nestId: nestId,
          eggId: eggId,
          dockerImage: 'ghcr.io/pterodactyl/games:latest',
          startup: startup,
          environment: {},
        });
        
        // Extract server identifier from Pterodactyl response
        // Pterodactyl API returns data in different formats depending on version
        const pterodactylServerId = pterodactylServer.attributes?.identifier 
          || pterodactylServer.data?.attributes?.identifier
          || pterodactylServer.data?.identifier
          || pterodactylServer.identifier
          || null;
        
        if (!pterodactylServerId) {
          throw new Error('Failed to get server identifier from Pterodactyl');
        }
        
        // Save server to database
        const server = await Server.create({
          user_id: req.user.id,
          pterodactyl_server_id: pterodactylServerId,
          name,
          game_type,
          cpu_limit,
          memory_limit,
          disk_limit,
        });
        
        // Deduct coins
        await coinService.spendCoins(
          req.user.id,
          cost,
          'server_creation',
          `Created ${game_type} server: ${name}`
        );
        
        await client.query('COMMIT');
        
        res.status(201).json({
          message: 'Server created successfully',
          server: {
            id: server.id,
            name: server.name,
            game_type: server.game_type,
            cpu_limit: server.cpu_limit,
            memory_limit: server.memory_limit,
            disk_limit: server.disk_limit,
            status: server.status,
          },
          coinsSpent: cost,
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    } finally {
      client.release();
    }
  }
);

// Update server resources
router.put(
  '/:id/resources',
  [
    param('id').isUUID().withMessage('Invalid server ID format'),
    body('cpu_limit').optional().isInt({ min: 1, max: 1000 }).withMessage('CPU limit must be between 1 and 1000'),
    body('memory_limit').optional().isInt({ min: 512, max: 32768 }).withMessage('Memory limit must be between 512MB and 32768MB'),
    body('disk_limit').optional().isInt({ min: 1024, max: 1000000 }).withMessage('Disk limit must be between 1024MB and 1000000MB'),
  ],
  validate,
  async (req, res, next) => {
    const client = await pool.connect();
    
    try {
      const server = await Server.findById(req.params.id);
      if (!server || server.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Server not found' });
      }

      // Prepare new resources (use existing if not provided)
      const newResources = {
        cpu_limit: req.body.cpu_limit !== undefined ? req.body.cpu_limit : server.cpu_limit,
        memory_limit: req.body.memory_limit !== undefined ? req.body.memory_limit : server.memory_limit,
        disk_limit: req.body.disk_limit !== undefined ? req.body.disk_limit : server.disk_limit,
      };

      // Calculate upgrade cost
      const cost = await calculateResourceUpgradeCost(
        {
          cpu_limit: server.cpu_limit,
          memory_limit: server.memory_limit,
          disk_limit: server.disk_limit,
        },
        newResources
      );

      // If there's a cost, check balance and deduct coins
      if (cost > 0) {
        const balance = await coinService.getBalance(req.user.id);
        if (balance.coins < cost) {
          return res.status(400).json({
            error: 'Insufficient coins for upgrade',
            required: cost,
            available: balance.coins,
          });
        }
      }

      await client.query('BEGIN');

      try {
        // Update resources in Pterodactyl
        if (server.pterodactyl_server_id) {
          await pterodactylService.updateServerResources(server.pterodactyl_server_id, {
            cpu: newResources.cpu_limit,
            memory: newResources.memory_limit,
            disk: newResources.disk_limit,
            io: 500,
            swap: 0,
          });
        }

        // Update resources in database
        const updated = await Server.updateResources(req.params.id, newResources);

        // Deduct coins if there was a cost
        if (cost > 0) {
          await coinService.spendCoins(
            req.user.id,
            cost,
            'server_upgrade',
            `Upgraded server ${server.name}: CPU ${server.cpu_limit}%→${newResources.cpu_limit}%, RAM ${server.memory_limit}MB→${newResources.memory_limit}MB, Disk ${server.disk_limit}MB→${newResources.disk_limit}MB`
          );
        }

        await client.query('COMMIT');

        res.json({
          ...updated,
          coinsSpent: cost,
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    } finally {
      client.release();
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

