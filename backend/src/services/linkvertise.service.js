const axios = require('axios');
const config = require('../config/revenue');

class LinkvertiseService {
  constructor() {
    this.apiKey = config.linkvertise.apiKey;
    this.enabled = config.linkvertise.enabled;
  }

  async generateLink(userId, targetUrl) {
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
    if (!this.enabled) {
      return false;
    }

    // Check if manual verification mode is enabled
    const manualMode = process.env.LINKVERTISE_MANUAL_MODE === 'true';
    
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

  getCoinsReward() {
    return config.linkvertise.coinsPerCompletion;
  }

  getCooldownMinutes() {
    return config.linkvertise.cooldownMinutes;
  }
}

module.exports = new LinkvertiseService();

