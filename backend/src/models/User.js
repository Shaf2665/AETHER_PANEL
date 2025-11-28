const pool = require('../config/database');

class User {
  static async create(userData) {
    const { username, email, password_hash, discord_id, discord_username, discord_avatar } = userData;
    
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

    fields.push('coins', 'total_earned_coins');
    values.push(0, 0);

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const fieldNames = fields.join(', ');

    const query = `
      INSERT INTO users (${fieldNames})
      VALUES (${placeholders})
      RETURNING id, username, email, discord_id, discord_username, discord_avatar, coins, total_earned_coins, created_at
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
    const query = 'SELECT id, username, email, discord_id, discord_username, discord_avatar, coins, total_earned_coins, created_at, last_active FROM users WHERE id = $1';
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
}

module.exports = User;

