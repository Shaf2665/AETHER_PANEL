const axios = require('axios');
const config = require('../config/pterodactyl');

class PterodactylService {
  constructor() {
    // Initialize with env vars, will be refreshed on first use
    this.baseURL = config.baseUrl;
    this.apiKey = config.applicationApiKey;
    this.clientApiKey = config.clientApiKey;
  }

  /**
   * Refresh configuration from database before making requests
   */
  async refreshConfig() {
    try {
      await config.refresh();
      this.baseURL = config.baseUrl;
      this.apiKey = config.applicationApiKey;
      this.clientApiKey = config.clientApiKey;
    } catch (error) {
      console.warn('Failed to refresh Pterodactyl config, using cached/env values:', error.message);
    }
  }

  async makeRequest(method, endpoint, data = null, useClientApi = false) {
    // Refresh config before making request to ensure we have latest settings
    await this.refreshConfig();
    
    const url = `${this.baseURL}/api${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${useClientApi ? this.clientApiKey : this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      const response = await axios({
        method,
        url,
        headers,
        data,
      });
      return response.data;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        endpoint: `${method} ${endpoint}`,
        timestamp: new Date().toISOString(),
      };
      
      console.error('Pterodactyl API Error:', errorDetails);
      
      // Provide user-friendly error messages
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Pterodactyl API authentication failed. Please check API keys.');
      } else if (error.response?.status === 404) {
        throw new Error('Pterodactyl resource not found.');
      } else if (error.response?.status >= 500) {
        throw new Error('Pterodactyl service is temporarily unavailable.');
      } else {
        const detail = error.response?.data?.errors?.[0]?.detail || error.message;
        throw new Error(`Pterodactyl API Error: ${detail}`);
      }
    }
  }

  async createServer(config) {
    const {
      name,
      userId,
      description,
      cpu,
      memory,
      disk,
      io,
      swap,
      nodeId,
      nestId,
      eggId,
      dockerImage,
      startup,
      environment,
    } = config;

    // Validate required fields
    if (!eggId || isNaN(eggId)) {
      throw new Error(`Invalid egg_id: ${eggId}. Egg ID must be a positive integer.`);
    }
    if (!nestId || isNaN(nestId)) {
      throw new Error(`Invalid nest_id: ${nestId}. Nest ID must be a positive integer.`);
    }
    if (!nodeId || isNaN(nodeId)) {
      throw new Error(`Invalid node_id: ${nodeId}. Node ID must be a positive integer.`);
    }

    const serverData = {
      name,
      user: userId,
      description: description || `Game server for user ${userId}`,
      limits: {
        cpu,
        memory,
        disk,
        io,
        swap: swap || 0,
      },
      feature_limits: {
        databases: 0,
        allocations: 1,
        backups: 0,
      },
      allocation: {
        default: 1,
      },
      nest_id: parseInt(nestId, 10),
      egg: parseInt(eggId, 10),  // Changed from egg_id to egg (Pterodactyl API expects 'egg')
      node_id: parseInt(nodeId, 10),  // Added node_id (required by Pterodactyl API)
      docker_image: dockerImage || 'ghcr.io/pterodactyl/games:latest',
      startup,
      environment: environment || {},
    };

    console.log('Creating Pterodactyl server with data:', {
      name,
      userId,
      nest_id: serverData.nest_id,
      egg: serverData.egg,  // Changed from egg_id to egg
      node_id: serverData.node_id,  // Added node_id
      nodeId: nodeId
    });

    return await this.makeRequest('POST', '/application/servers', serverData);
  }

  async getServer(serverId) {
    return await this.makeRequest('GET', `/application/servers/${serverId}`);
  }

  async updateServerResources(serverId, resources) {
    const { cpu, memory, disk, io, swap } = resources;
    const updateData = {
      limits: {
        cpu,
        memory,
        disk,
        io: io || 500,
        swap: swap || 0,
      },
    };

    return await this.makeRequest('PATCH', `/application/servers/${serverId}/build`, updateData);
  }

  async suspendServer(serverId) {
    return await this.makeRequest('POST', `/application/servers/${serverId}/suspend`);
  }

  async unsuspendServer(serverId) {
    return await this.makeRequest('POST', `/application/servers/${serverId}/unsuspend`);
  }

  async deleteServer(serverId) {
    return await this.makeRequest('DELETE', `/application/servers/${serverId}`);
  }

  async getServerStatus(serverId) {
    return await this.makeRequest('GET', `/application/servers/${serverId}/resources`, null, true);
  }

  async getNests() {
    return await this.makeRequest('GET', '/application/nests');
  }

  async getEggs(nestId) {
    return await this.makeRequest('GET', `/application/nests/${nestId}/eggs`);
  }

  async getNodes() {
    return await this.makeRequest('GET', '/application/nodes');
  }

  async getUsers() {
    return await this.makeRequest('GET', '/application/users');
  }

  /**
   * Test connection with custom credentials (for testing before saving)
   * @param {string} baseUrl - Pterodactyl panel URL
   * @param {string} apiKey - Application API key
   * @returns {Promise<Object>} Test result
   */
  async testConnection(baseUrl, apiKey) {
    const url = `${baseUrl}/api/application/users`;
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      const response = await axios({
        method: 'GET',
        url,
        headers,
        timeout: 10000, // 10 second timeout
      });
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return { success: false, message: 'Invalid API key. Please check your Application API key.' };
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return { success: false, message: 'Cannot connect to Pterodactyl Panel. Please check the URL.' };
      } else if (error.code === 'ETIMEDOUT') {
        return { success: false, message: 'Connection timeout. Please check your network and panel URL.' };
      } else {
        return { success: false, message: error.response?.data?.errors?.[0]?.detail || error.message || 'Connection failed' };
      }
    }
  }

  /**
   * Fetch options with custom credentials (for fetching before saving)
   * @param {string} baseUrl - Pterodactyl panel URL
   * @param {string} apiKey - Application API key
   * @returns {Promise<Object>} Fetched options
   */
  async fetchOptions(baseUrl, apiKey) {
    const url = (endpoint) => `${baseUrl}/api${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const makeRequest = async (endpoint) => {
      try {
        const response = await axios({
          method: 'GET',
          url: url(endpoint),
          headers,
          timeout: 10000,
        });
        return { success: true, data: response.data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    };

    const [nodesResult, nestsResult, usersResult] = await Promise.all([
      makeRequest('/application/nodes'),
      makeRequest('/application/nests'),
      makeRequest('/application/users'),
    ]);

    // Fetch eggs for each nest
    const eggsByNest = {};
    if (nestsResult.success && nestsResult.data) {
      // Handle both array format and data wrapper format
      const nests = Array.isArray(nestsResult.data) ? nestsResult.data : (nestsResult.data.data || []);
      const nestIds = nests.map(nest => nest.attributes?.id || nest.id).filter(id => id);
      
      if (nestIds.length > 0) {
        const eggPromises = nestIds.map(async (nestId) => {
          const eggResult = await makeRequest(`/application/nests/${nestId}/eggs`);
          return { nestId, eggs: eggResult.success ? eggResult.data : null };
        });
        const eggResults = await Promise.all(eggPromises);
        eggResults.forEach(({ nestId, eggs }) => {
          if (eggs) {
            eggsByNest[nestId] = eggs;
          }
        });
      }
    }

    return {
      nodes: nodesResult.success ? nodesResult.data : null,
      nests: nestsResult.success ? nestsResult.data : null,
      users: usersResult.success ? usersResult.data : null,
      eggsByNest,
      errors: {
        nodes: nodesResult.success ? null : nodesResult.error,
        nests: nestsResult.success ? null : nestsResult.error,
        users: usersResult.success ? null : usersResult.error,
      },
    };
  }
}

module.exports = new PterodactylService();

