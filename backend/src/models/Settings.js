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
}

module.exports = Settings;

