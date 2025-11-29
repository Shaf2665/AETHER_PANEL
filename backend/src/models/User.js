const pool = require('../config/database');

class User {
  static async create(userData) {
    const { username, email, password_hash, discord_id, discord_username, discord_avatar, role } = userData;
    
    // Build query dynamically based on provided fields
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (username) {
      fields.push('username');
      values.push(username);
      paramCount++;
    }
    if (email) {
      fields.push('email');
      values.push(email);
      paramCount++;
    }
    if (password_hash) {
      fields.push('password_hash');
      values.push(password_hash);
      paramCount++;
    }
    if (discord_id) {
      fields.push('discord_id');
      values.push(discord_id);
      paramCount++;
    }
    if (discord_username) {
      fields.push('discord_username');
      values.push(discord_username);
      paramCount++;
    }
    if (discord_avatar) {
      fields.push('discord_avatar');
      values.push(discord_avatar);
      paramCount++;
    }
    if (role) {
      fields.push('role');
      values.push(role);
      paramCount++;
    }

    fields.push('coins', 'total_earned_coins');
    values.push(0, 0);

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const fieldNames = fields.join(', ');

    const query = `
      INSERT INTO users (${fieldNames})
      VALUES (${placeholders})
      RETURNING id, username, email, discord_id, discord_username, discord_avatar, role, coins, total_earned_coins, created_at
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT id, username, email, discord_id, discord_username, discord_avatar, role, coins, total_earned_coins, created_at, last_active FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  static async findByDiscordId(discordId) {
    const query = 'SELECT * FROM users WHERE discord_id = $1';
    const result = await pool.query(query, [discordId]);
    return result.rows[0];
  }

  static async updateDiscordInfo(userId, discordUsername, discordAvatar) {
    const query = `
      UPDATE users 
      SET discord_username = $1, discord_avatar = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [discordUsername, discordAvatar, userId]);
    return result.rows[0];
  }

  static async updateCoins(userId, amount) {
    const query = `
      UPDATE users 
      SET coins = coins + $1, 
          total_earned_coins = CASE 
            WHEN $1 > 0 THEN total_earned_coins + $1 
            ELSE total_earned_coins 
          END
      WHERE id = $2
      RETURNING coins, total_earned_coins
    `;
    const result = await pool.query(query, [amount, userId]);
    return result.rows[0];
  }

  static async updateLastActive(userId) {
    const query = 'UPDATE users SET last_active = NOW() WHERE id = $1';
    await pool.query(query, [userId]);
  }

  static async findAll(page = 1, limit = 20, search = '', roleFilter = '') {
    const offset = (page - 1) * limit;
    let query = 'SELECT id, username, email, discord_username, role, coins, total_earned_coins, created_at, last_active FROM users';
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (search) {
      conditions.push(`(username ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (roleFilter) {
      conditions.push(`role = $${paramCount}`);
      values.push(roleFilter);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM users';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await pool.query(countQuery, values.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    return {
      users: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async updateRole(userId, role) {
    if (!['user', 'admin'].includes(role)) {
      throw new Error('Invalid role. Must be "user" or "admin"');
    }
    const query = 'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role';
    const result = await pool.query(query, [role, userId]);
    return result.rows[0];
  }

  static async update(userId, updateData) {
    const { username, email, role, coins } = updateData;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramCount}`);
      values.push(username);
      paramCount++;
    }
    if (email !== undefined) {
      // Check if email already exists for another user
      const existingUser = await this.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email already in use by another user');
      }
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }
    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) {
        throw new Error('Invalid role. Must be "user" or "admin"');
      }
      updates.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }
    if (coins !== undefined) {
      updates.push(`coins = $${paramCount}`);
      values.push(coins);
      paramCount++;
    }

    if (updates.length === 0) {
      return await this.findById(userId);
    }

    values.push(userId);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, email, role, coins, total_earned_coins, created_at, last_active
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(userId) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id, username';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = User;

