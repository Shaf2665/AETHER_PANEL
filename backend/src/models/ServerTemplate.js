const pool = require('../config/database');
const { validateGradientColors, sanitizeGradientColors } = require('../utils/colorValidator');
const { validateIcon, sanitizeIcon } = require('../utils/iconValidator');

class ServerTemplate {
  /**
   * Find all templates, sorted by display_order
   * @param {boolean} enabledOnly - If true, only return enabled templates
   * @returns {Promise<Array>} Array of template objects
   */
  static async findAll(enabledOnly = false) {
    try {
      let query = 'SELECT * FROM server_templates';
      const params = [];
      
      if (enabledOnly) {
        query += ' WHERE enabled = $1';
        params.push(true);
      }
      
      query += ' ORDER BY display_order ASC, created_at ASC';
      
      const result = await pool.query(query, params);
      return result.rows.map(row => this._parseRow(row));
    } catch (error) {
      console.error('Error finding all templates:', error);
      throw error;
    }
  }

  /**
   * Find template by ID
   * @param {string} id - Template UUID
   * @returns {Promise<Object|null>} Template object or null if not found
   */
  static async findById(id) {
    try {
      const result = await pool.query('SELECT * FROM server_templates WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return this._parseRow(result.rows[0]);
    } catch (error) {
      console.error('Error finding template by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new template
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} Created template object
   */
  static async create(templateData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Validate and sanitize inputs
      const sanitized = this._sanitizeTemplateData(templateData);
      
      // Auto-assign display_order if not provided
      if (sanitized.display_order === undefined || sanitized.display_order === null) {
        const maxOrderResult = await client.query(
          'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM server_templates'
        );
        sanitized.display_order = parseInt(maxOrderResult.rows[0].next_order) || 0;
      }
      
      // Ensure gradient_colors is defined before validation
      if (!sanitized.gradient_colors) {
        sanitized.gradient_colors = { color1: '#3b82f6', color2: '#06b6d4' };
      }
      
      // Validate gradient colors
      const gradientValidation = validateGradientColors(sanitized.gradient_colors);
      if (!gradientValidation.valid) {
        throw new Error(`Invalid gradient colors: ${gradientValidation.error}`);
      }
      sanitized.gradient_colors = gradientValidation.sanitized;
      
      // Validate icon
      if (!validateIcon(sanitized.icon)) {
        sanitized.icon = sanitizeIcon(sanitized.icon, 'ServerIcon');
      }
      
      const query = `
        INSERT INTO server_templates (
          name, description, cpu_cores, ram_gb, disk_gb, price, 
          game_type, enabled, icon, gradient_colors, display_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        sanitized.name,
        sanitized.description || '',
        sanitized.cpu_cores,
        sanitized.ram_gb,
        sanitized.disk_gb,
        sanitized.price,
        sanitized.game_type,
        sanitized.enabled !== undefined ? sanitized.enabled : true,
        sanitized.icon,
        JSON.stringify(sanitized.gradient_colors),
        sanitized.display_order,
      ];
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return this._parseRow(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating template:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a template
   * @param {string} id - Template UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated template object or null if not found
   */
  static async update(id, updates) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if template exists
      const existing = await this.findById(id);
      if (!existing) {
        await client.query('ROLLBACK');
        return null;
      }
      
      // Sanitize updates
      const sanitized = this._sanitizeTemplateData(updates, existing);
      
      // Validate gradient colors if provided
      if (sanitized.gradient_colors) {
        const gradientValidation = validateGradientColors(sanitized.gradient_colors);
        if (!gradientValidation.valid) {
          throw new Error(`Invalid gradient colors: ${gradientValidation.error}`);
        }
        sanitized.gradient_colors = gradientValidation.sanitized;
      }
      
      // Validate icon if provided
      if (sanitized.icon && !validateIcon(sanitized.icon)) {
        sanitized.icon = sanitizeIcon(sanitized.icon, existing.icon);
      }
      
      // Build update query dynamically
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      const allowedFields = ['name', 'description', 'cpu_cores', 'ram_gb', 'disk_gb', 'price', 
                             'game_type', 'enabled', 'icon', 'gradient_colors', 'display_order'];
      
      for (const field of allowedFields) {
        if (sanitized[field] !== undefined) {
          if (field === 'gradient_colors') {
            updateFields.push(`${field} = $${paramIndex}`);
            values.push(JSON.stringify(sanitized[field]));
          } else {
            updateFields.push(`${field} = $${paramIndex}`);
            values.push(sanitized[field]);
          }
          paramIndex++;
        }
      }
      
      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return existing;
      }
      
      values.push(id);
      const query = `
        UPDATE server_templates
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return this._parseRow(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating template:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a template
   * @param {string} id - Template UUID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async delete(id) {
    try {
      const result = await pool.query(
        'DELETE FROM server_templates WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Check if template is referenced by any servers
   * Note: This assumes servers table has a template_id field or we check by matching resources
   * For now, we'll check if any servers match this template's specs
   * @param {string} id - Template UUID
   * @returns {Promise<boolean>} True if template is in use
   */
  static async checkTemplateUsage(id) {
    try {
      const template = await this.findById(id);
      if (!template) {
        return false;
      }
      
      // Check if any servers match this template's configuration
      // This is a simplified check - in production you might want a template_id foreign key
      const query = `
        SELECT COUNT(*) as count
        FROM servers
        WHERE cpu_limit = $1 
          AND memory_limit = $2 
          AND disk_limit = $3
          AND game_type = $4
          AND status != 'deleted'
      `;
      
      // Convert template specs to server limits (cpu_cores * 100 for percentage, ram_gb * 1024 for MB, disk_gb * 1024 for MB)
      const cpuLimit = template.cpu_cores * 100;
      const memoryLimit = template.ram_gb * 1024;
      const diskLimit = template.disk_gb * 1024;
      
      const result = await pool.query(query, [
        cpuLimit,
        memoryLimit,
        diskLimit,
        template.game_type,
      ]);
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error checking template usage:', error);
      // Return true on error to be safe (prevent deletion)
      return true;
    }
  }

  /**
   * Reorder templates
   * @param {Array} reorderData - Array of {id, display_order}
   * @returns {Promise<Array>} Updated templates
   */
  static async reorder(reorderData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update each template's display_order
      for (const item of reorderData) {
        await client.query(
          'UPDATE server_templates SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.display_order, item.id]
        );
      }
      
      await client.query('COMMIT');
      
      // Return all templates sorted by new order
      return await this.findAll();
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error reordering templates:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Parse database row to template object
   * @private
   */
  static _parseRow(row) {
    if (!row) return null;
    
    // Parse gradient_colors with error handling
    let gradientColors;
    if (typeof row.gradient_colors === 'string') {
      try {
        gradientColors = JSON.parse(row.gradient_colors);
      } catch (error) {
        console.error('Error parsing gradient_colors JSON:', error);
        // Use default gradient colors on parse error
        gradientColors = { color1: '#3b82f6', color2: '#06b6d4' };
      }
    } else {
      gradientColors = row.gradient_colors || { color1: '#3b82f6', color2: '#06b6d4' };
    }
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      cpu_cores: row.cpu_cores,
      ram_gb: row.ram_gb,
      disk_gb: row.disk_gb,
      price: parseFloat(row.price),
      game_type: row.game_type,
      enabled: row.enabled,
      icon: row.icon,
      gradient_colors: gradientColors,
      display_order: row.display_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Sanitize template data
   * @private
   */
  static _sanitizeTemplateData(data, existing = {}) {
    const sanitized = {};
    
    if (data.name !== undefined) {
      sanitized.name = String(data.name).trim().substring(0, 100);
    }
    
    if (data.description !== undefined) {
      sanitized.description = String(data.description).trim().substring(0, 500);
    }
    
    if (data.cpu_cores !== undefined) {
      sanitized.cpu_cores = Math.max(1, Math.min(100, parseInt(data.cpu_cores) || 1));
    }
    
    if (data.ram_gb !== undefined) {
      sanitized.ram_gb = Math.max(1, Math.min(1000, parseInt(data.ram_gb) || 1));
    }
    
    if (data.disk_gb !== undefined) {
      sanitized.disk_gb = Math.max(1, Math.min(10000, parseInt(data.disk_gb) || 1));
    }
    
    if (data.price !== undefined) {
      sanitized.price = Math.max(0.01, Math.min(1000000, parseFloat(data.price) || 0.01));
    }
    
    if (data.game_type !== undefined) {
      const validTypes = ['minecraft', 'fivem', 'other'];
      sanitized.game_type = validTypes.includes(data.game_type) ? data.game_type : (existing.game_type || 'other');
    }
    
    if (data.enabled !== undefined) {
      sanitized.enabled = Boolean(data.enabled);
    }
    
    if (data.icon !== undefined) {
      sanitized.icon = sanitizeIcon(data.icon, existing.icon || 'ServerIcon');
    }
    
    if (data.gradient_colors !== undefined) {
      if (typeof data.gradient_colors === 'string') {
        try {
          sanitized.gradient_colors = JSON.parse(data.gradient_colors);
        } catch (error) {
          console.error('Error parsing gradient_colors JSON in sanitize:', error);
          // Use existing gradient_colors or default if parse fails
          sanitized.gradient_colors = existing.gradient_colors || { color1: '#3b82f6', color2: '#06b6d4' };
        }
      } else {
        sanitized.gradient_colors = data.gradient_colors;
      }
    }
    
    if (data.display_order !== undefined) {
      sanitized.display_order = Math.max(0, parseInt(data.display_order) || 0);
    }
    
    return sanitized;
  }
}

module.exports = ServerTemplate;

