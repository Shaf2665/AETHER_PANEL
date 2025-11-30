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
      nest_id: nestId,
      egg_id: eggId,
      docker_image: dockerImage || 'ghcr.io/pterodactyl/games:latest',
      startup,
      environment: environment || {},
    };

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
}

module.exports = new PterodactylService();

