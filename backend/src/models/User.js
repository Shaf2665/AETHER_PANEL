const pool = require('../config/database');

class User {
  static async create(userData) {
    const { username, email, password_hash } = userData;
    const query = `
      INSERT INTO users (username, email, password_hash, coins, total_earned_coins)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, coins, total_earned_coins, created_at
    `;
    const values = [username, email, password_hash, 0, 0];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT id, username, email, coins, total_earned_coins, created_at, last_active FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
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

