const axios = require('axios');
const revenueConfig = require('../config/revenue');

class LinkvertiseService {
  constructor() {
    // Initialize with env vars, will be refreshed on first use
    this.apiKey = '';
    this.enabled = false;
    this.coinsPerCompletion = 50;
    this.cooldownMinutes = 30;
    this.manualMode = true;
  }

  /**
   * Refresh configuration from database before making requests
   */
  async refreshConfig() {
    try {
      const config = await revenueConfig.getLinkvertiseConfig();
      this.apiKey = config.apiKey || '';
      this.enabled = config.enabled || false;
      this.coinsPerCompletion = config.coinsPerCompletion || 50;
      this.cooldownMinutes = config.cooldownMinutes || 30;
      this.manualMode = config.manualMode !== false; // Default to true
    } catch (error) {
      console.warn('Failed to refresh Linkvertise config, using cached/env values:', error.message);
      // Fallback to env vars
      this.apiKey = process.env.LINKVERTISE_API_KEY || '';
      this.enabled = process.env.LINKVERTISE_ENABLED === 'true';
      this.coinsPerCompletion = parseInt(process.env.LINKVERTISE_COINS || '50', 10);
      this.cooldownMinutes = parseInt(process.env.LINKVERTISE_COOLDOWN || '30', 10);
      this.manualMode = process.env.LINKVERTISE_MANUAL_MODE !== 'false';
    }
  }

  async generateLink(userId, targetUrl) {
    // Refresh config before operation
    await this.refreshConfig();
    
    if (!this.enabled) {
      throw new Error('Linkvertise is not enabled');
    }

    // Generate a unique link for the user
    // This would typically involve calling Linkvertise API
    // For now, we'll create a placeholder implementation
    
    const linkId = `lv_${userId}_${Date.now()}`;
    const linkvertiseUrl = `https://linkvertise.com/${this.apiKey}/${linkId}`;
    
    return {
      linkId,
      linkvertiseUrl,
      targetUrl,
    };
  }

  async verifyCompletion(linkId) {
    // Refresh config before operation
    await this.refreshConfig();
    
    if (!this.enabled) {
      return false;
    }

    // Check if manual verification mode is enabled
    const manualMode = this.manualMode;
    
    if (manualMode) {
      // Manual verification mode: verify that the link exists and is valid
      // The actual completion is trusted (user clicks "Mark as Complete")
      // This mode allows the feature to work while API integration is being set up
      const RevenueTask = require('../models/RevenueTask');
      const task = await RevenueTask.findByTaskId(linkId);
      
      if (!task) {
        return false;
      }
      
      // Check if task is still valid (not expired, not already completed)
      if (task.status !== 'pending') {
        return false;
      }
      
      // Check if task hasn't expired
      if (task.expires_at && new Date(task.expires_at) < new Date()) {
        return false;
      }
      
      // Manual mode: trust user completion
      return true;
    }

    // API verification mode (when API key is configured)
    if (!this.apiKey || this.apiKey === '') {
      console.warn('⚠️  Linkvertise API key not configured. Use LINKVERTISE_MANUAL_MODE=true for manual verification.');
      return false;
    }

    // TODO: Implement actual Linkvertise API verification
    // This would call Linkvertise's verification API or webhook
    // Example implementation:
    // try {
    //   const response = await axios.get(`https://api.linkvertise.com/v1/verify/${linkId}`, {
    //     headers: { 'Authorization': `Bearer ${this.apiKey}` }
    //   });
    //   return response.data.completed === true;
    // } catch (error) {
    //   console.error('Linkvertise API verification error:', error);
    //   return false;
    // }
    
    // For now, if not in manual mode and API not implemented, return false
    console.warn('⚠️  Linkvertise API verification not implemented. Set LINKVERTISE_MANUAL_MODE=true for manual verification.');
    return false;
  }

  async getCoinsReward() {
    await this.refreshConfig();
    return this.coinsPerCompletion;
  }

  async getCooldownMinutes() {
    await this.refreshConfig();
    return this.cooldownMinutes;
  }
}

module.exports = new LinkvertiseService();

