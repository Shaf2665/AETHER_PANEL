const pool = require('../config/database');

class Settings {
  /**
   * Get a single setting value by key
   * @param {string} key - Setting key
   * @returns {Promise<string|null>} Setting value or null if not found
   */
  static async get(key) {
    try {
      const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
      return result.rows[0]?.value || null;
    } catch (error) {
      console.error('Error getting setting:', error);
      return null;
    }
  }

  /**
   * Set a setting value
   * @param {string} key - Setting key
   * @param {string} value - Setting value
   * @returns {Promise<void>}
   */
  static async set(key, value) {
    try {
      await pool.query(
        'INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
        [key, value || '']
      );
    } catch (error) {
      console.error('Error setting setting:', error);
      throw error;
    }
  }

  /**
   * Get all settings as a key-value object
   * @returns {Promise<Object>} Object with key-value pairs
   */
  static async getAll() {
    try {
      const result = await pool.query('SELECT key, value FROM settings');
      return result.rows.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error getting all settings:', error);
      return {};
    }
  }

  /**
   * Get Pterodactyl configuration from settings
   * @returns {Promise<Object>} Pterodactyl configuration object
   */
  static async getPterodactylConfig() {
    try {
      const settings = await this.getAll();
      return {
        url: settings.pterodactyl_url || '',
        apiKey: settings.pterodactyl_api_key || '',
        clientApiKey: settings.pterodactyl_client_api_key || '',
        applicationApiKey: settings.pterodactyl_application_api_key || '',
        nodeId: parseInt(settings.pterodactyl_node_id || '1', 10),
        nestId: parseInt(settings.pterodactyl_nest_id || '1', 10),
        eggIds: {
          minecraft: parseInt(settings.pterodactyl_egg_id_minecraft || '1', 10),
          fivem: parseInt(settings.pterodactyl_egg_id_fivem || '2', 10),
          other: parseInt(settings.pterodactyl_egg_id_other || '1', 10),
        },
        defaultUserId: parseInt(settings.pterodactyl_default_user_id || '1', 10),
      };
    } catch (error) {
      console.error('Error getting Pterodactyl config:', error);
      return {
        url: '',
        apiKey: '',
        clientApiKey: '',
        applicationApiKey: '',
        nodeId: 1,
        nestId: 1,
        eggIds: {
          minecraft: 1,
          fivem: 2,
          other: 1,
        },
        defaultUserId: 1,
      };
    }
  }

  /**
   * Get Linkvertise configuration from settings
   * @returns {Promise<Object>} Linkvertise configuration object
   */
  static async getLinkvertiseConfig() {
    try {
      const settings = await this.getAll();
      return {
        enabled: settings.linkvertise_enabled === 'true',
        apiKey: settings.linkvertise_api_key || '',
        coinsPerCompletion: parseInt(settings.linkvertise_coins_per_completion || '50', 10),
        cooldownMinutes: parseInt(settings.linkvertise_cooldown_minutes || '30', 10),
        manualMode: settings.linkvertise_manual_mode !== 'false', // Default to true
      };
    } catch (error) {
      console.error('Error getting Linkvertise config:', error);
      return {
        enabled: false,
        apiKey: '',
        coinsPerCompletion: 50,
        cooldownMinutes: 30,
        manualMode: true,
      };
    }
  }

  /**
   * Get default theme configuration
   * @returns {Object} Default theme configuration object
   */
  static getDefaultThemeConfig() {
    return {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        sidebarBg: 'linear-gradient(to bottom, #1f2937, #111827)',
        sidebarText: '#ffffff',
        sidebarHover: 'rgba(255, 255, 255, 0.1)',
        navActive: 'linear-gradient(to right, #3b82f6, #06b6d4)',
        background: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)',
        cardBg: 'rgba(255, 255, 255, 0.8)',
        textPrimary: '#111827',
        textSecondary: '#6b7280',
      },
      navigation: {
        dashboard: 'linear-gradient(to right, #3b82f6, #06b6d4)',
        servers: 'linear-gradient(to right, #a855f7, #ec4899)',
        earnCoins: 'linear-gradient(to right, #10b981, #14b8a6)',
        store: 'linear-gradient(to right, #f59e0b, #f97316)',
        admin: 'linear-gradient(to right, #ef4444, #f43f5e)',
      },
      background: {
        image: '',
        overlay: 'rgba(0, 0, 0, 0)',
        position: 'center',
        size: 'cover',
        repeat: 'no-repeat',
      },
      customCSS: '',
    };
  }

  /**
   * Get theme configuration from settings
   * @returns {Promise<Object>} Theme configuration object
   */
  static async getThemeConfig() {
    try {
      const themeConfigStr = await this.get('theme_config');
      if (!themeConfigStr) {
        return this.getDefaultThemeConfig();
      }

      const themeConfig = JSON.parse(themeConfigStr);
      
      // Merge with defaults to ensure all properties exist
      const defaults = this.getDefaultThemeConfig();
      return {
        colors: { ...defaults.colors, ...(themeConfig.colors || {}) },
        navigation: { ...defaults.navigation, ...(themeConfig.navigation || {}) },
        background: { ...defaults.background, ...(themeConfig.background || {}) },
        customCSS: themeConfig.customCSS || '',
      };
    } catch (error) {
      console.error('Error getting theme config:', error);
      return this.getDefaultThemeConfig();
    }
  }

  /**
   * Set theme configuration
   * @param {Object} config - Theme configuration object
   * @returns {Promise<void>}
   */
  static async setThemeConfig(config) {
    try {
      // Validate config structure
      if (!config || typeof config !== 'object') {
        throw new Error('Theme config must be an object');
      }

      // Ensure all required sections exist
      const defaults = this.getDefaultThemeConfig();
      const validatedConfig = {
        colors: { ...defaults.colors, ...(config.colors || {}) },
        navigation: { ...defaults.navigation, ...(config.navigation || {}) },
        background: { ...defaults.background, ...(config.background || {}) },
        customCSS: config.customCSS || '',
      };

      // Stringify and save
      const configStr = JSON.stringify(validatedConfig);
      await this.set('theme_config', configStr);
    } catch (error) {
      console.error('Error setting theme config:', error);
      throw error;
    }
  }

  /**
   * Get branding configuration from settings
   * @returns {Promise<Object>} Branding configuration object
   */
  static async getBrandingConfig() {
    try {
      const settings = await this.getAll();
      return {
        dashboardName: settings.dashboard_name || 'Aether Dashboard',
        dashboardShortName: settings.dashboard_short_name || 'Aether',
        sidebarLogoUrl: settings.sidebar_logo_url || '',
        mainLogoUrl: settings.main_logo_url || '',
      };
    } catch (error) {
      console.error('Error getting branding config:', error);
      return {
        dashboardName: 'Aether Dashboard',
        dashboardShortName: 'Aether',
        sidebarLogoUrl: '',
        mainLogoUrl: '',
      };
    }
  }

  /**
   * Set branding configuration
   * @param {Object} config - Branding configuration object
   * @returns {Promise<void>}
   */
  static async setBrandingConfig(config) {
    try {
      // Validate config structure
      if (!config || typeof config !== 'object') {
        throw new Error('Branding config must be an object');
      }

      // Validate and set each field
      if (config.dashboardName !== undefined) {
        await this.set('dashboard_name', String(config.dashboardName || 'Aether Dashboard'));
      }
      if (config.dashboardShortName !== undefined) {
        await this.set('dashboard_short_name', String(config.dashboardShortName || 'Aether'));
      }
      if (config.sidebarLogoUrl !== undefined) {
        await this.set('sidebar_logo_url', String(config.sidebarLogoUrl || ''));
      }
      if (config.mainLogoUrl !== undefined) {
        await this.set('main_logo_url', String(config.mainLogoUrl || ''));
      }
    } catch (error) {
      console.error('Error setting branding config:', error);
      throw error;
    }
  }

  /**
   * Get resource pricing configuration from settings
   * @returns {Promise<Object>} Resource pricing configuration object
   */
  static async getResourcePricing() {
    try {
      const settings = await this.getAll();
      return {
        cpu: {
          per_core: parseFloat(settings.resource_pricing_cpu_per_core || '100'),
          per_hour: parseFloat(settings.resource_pricing_cpu_per_hour || '5'),
        },
        memory: {
          per_gb: parseFloat(settings.resource_pricing_memory_per_gb || '200'),
          per_hour: parseFloat(settings.resource_pricing_memory_per_hour || '10'),
        },
        disk: {
          per_gb: parseFloat(settings.resource_pricing_disk_per_gb || '50'),
          per_hour: parseFloat(settings.resource_pricing_disk_per_hour || '2'),
        },
      };
    } catch (error) {
      console.error('Error getting resource pricing config:', error);
      // Return defaults on error
      return {
        cpu: { per_core: 100, per_hour: 5 },
        memory: { per_gb: 200, per_hour: 10 },
        disk: { per_gb: 50, per_hour: 2 },
      };
    }
  }

  /**
   * Set resource pricing configuration
   * @param {Object} pricing - Resource pricing configuration object
   * @returns {Promise<void>}
   */
  static async setResourcePricing(pricing) {
    try {
      // Validate config structure
      if (!pricing || typeof pricing !== 'object') {
        throw new Error('Resource pricing config must be an object');
      }

      // Validate and set CPU pricing
      if (pricing.cpu) {
        if (pricing.cpu.per_core !== undefined) {
          const perCoreValue = typeof pricing.cpu.per_core === 'string' ? pricing.cpu.per_core.trim() : pricing.cpu.per_core;
          if (perCoreValue === '' || perCoreValue === null || perCoreValue === undefined) {
            throw new Error('CPU per_core value cannot be empty');
          }
          const perCore = parseFloat(perCoreValue);
          if (isNaN(perCore) || perCore < 0.01 || perCore > 10000) {
            throw new Error(`Invalid CPU per_core value: ${perCoreValue}. Must be between 0.01 and 10000.`);
          }
          await this.set('resource_pricing_cpu_per_core', String(perCore));
        }
        if (pricing.cpu.per_hour !== undefined) {
          const perHourValue = typeof pricing.cpu.per_hour === 'string' ? pricing.cpu.per_hour.trim() : pricing.cpu.per_hour;
          if (perHourValue === '' || perHourValue === null || perHourValue === undefined) {
            throw new Error('CPU per_hour value cannot be empty');
          }
          const perHour = parseFloat(perHourValue);
          if (isNaN(perHour) || perHour < 0.01 || perHour > 1000) {
            throw new Error(`Invalid CPU per_hour value: ${perHourValue}. Must be between 0.01 and 1000.`);
          }
          await this.set('resource_pricing_cpu_per_hour', String(perHour));
        }
      }

      // Validate and set Memory pricing
      if (pricing.memory) {
        if (pricing.memory.per_gb !== undefined) {
          const perGbValue = typeof pricing.memory.per_gb === 'string' ? pricing.memory.per_gb.trim() : pricing.memory.per_gb;
          if (perGbValue === '' || perGbValue === null || perGbValue === undefined) {
            throw new Error('Memory per_gb value cannot be empty');
          }
          const perGb = parseFloat(perGbValue);
          if (isNaN(perGb) || perGb < 0.01 || perGb > 10000) {
            throw new Error(`Invalid Memory per_gb value: ${perGbValue}. Must be between 0.01 and 10000.`);
          }
          await this.set('resource_pricing_memory_per_gb', String(perGb));
        }
        if (pricing.memory.per_hour !== undefined) {
          const perHourValue = typeof pricing.memory.per_hour === 'string' ? pricing.memory.per_hour.trim() : pricing.memory.per_hour;
          if (perHourValue === '' || perHourValue === null || perHourValue === undefined) {
            throw new Error('Memory per_hour value cannot be empty');
          }
          const perHour = parseFloat(perHourValue);
          if (isNaN(perHour) || perHour < 0.01 || perHour > 1000) {
            throw new Error(`Invalid Memory per_hour value: ${perHourValue}. Must be between 0.01 and 1000.`);
          }
          await this.set('resource_pricing_memory_per_hour', String(perHour));
        }
      }

      // Validate and set Disk pricing
      if (pricing.disk) {
        if (pricing.disk.per_gb !== undefined) {
          const perGbValue = typeof pricing.disk.per_gb === 'string' ? pricing.disk.per_gb.trim() : pricing.disk.per_gb;
          if (perGbValue === '' || perGbValue === null || perGbValue === undefined) {
            throw new Error('Disk per_gb value cannot be empty');
          }
          const perGb = parseFloat(perGbValue);
          if (isNaN(perGb) || perGb < 0.01 || perGb > 10000) {
            throw new Error(`Invalid Disk per_gb value: ${perGbValue}. Must be between 0.01 and 10000.`);
          }
          await this.set('resource_pricing_disk_per_gb', String(perGb));
        }
        if (pricing.disk.per_hour !== undefined) {
          const perHourValue = typeof pricing.disk.per_hour === 'string' ? pricing.disk.per_hour.trim() : pricing.disk.per_hour;
          if (perHourValue === '' || perHourValue === null || perHourValue === undefined) {
            throw new Error('Disk per_hour value cannot be empty');
          }
          const perHour = parseFloat(perHourValue);
          if (isNaN(perHour) || perHour < 0.01 || perHour > 1000) {
            throw new Error(`Invalid Disk per_hour value: ${perHourValue}. Must be between 0.01 and 1000.`);
          }
          await this.set('resource_pricing_disk_per_hour', String(perHour));
        }
      }
    } catch (error) {
      console.error('Error setting resource pricing config:', error);
      throw error;
    }
  }
}

module.exports = Settings;

