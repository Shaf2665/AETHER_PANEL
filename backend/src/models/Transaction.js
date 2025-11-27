const pool = require('../config/database');

class Transaction {
  static async create(transactionData) {
    const { user_id, type, amount, source, description } = transactionData;
    const query = `
      INSERT INTO transactions (user_id, type, amount, source, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [user_id, type, amount, source, description];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  static async getTotalByType(userId, type) {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE user_id = $1 AND type = $2
    `;
    const result = await pool.query(query, [userId, type]);
    return parseFloat(result.rows[0].total);
  }
}

module.exports = Transaction;

