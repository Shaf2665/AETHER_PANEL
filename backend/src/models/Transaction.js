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

  static async findAll(page = 1, limit = 50, userId = null, type = null, startDate = null, endDate = null) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT t.*, u.username, u.email 
      FROM transactions t 
      LEFT JOIN users u ON t.user_id = u.id
    `;
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (userId) {
      conditions.push(`t.user_id = $${paramCount}`);
      values.push(userId);
      paramCount++;
    }

    if (type) {
      conditions.push(`t.type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }

    if (startDate) {
      conditions.push(`t.created_at >= $${paramCount}`);
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      conditions.push(`t.created_at <= $${paramCount}`);
      values.push(endDate);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM transactions t';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await pool.query(countQuery, values.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    return {
      transactions: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = Transaction;

