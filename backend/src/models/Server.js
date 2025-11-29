const pool = require('../config/database');

class Server {
  static async create(serverData) {
    const { user_id, pterodactyl_server_id, name, game_type, cpu_limit, memory_limit, disk_limit } = serverData;
    const query = `
      INSERT INTO servers (user_id, pterodactyl_server_id, name, game_type, cpu_limit, memory_limit, disk_limit, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [user_id, pterodactyl_server_id, name, game_type, cpu_limit, memory_limit, disk_limit, 'active'];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM servers WHERE user_id = $1 AND status != $2 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId, 'deleted']);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM servers WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateResources(id, resources) {
    const { cpu_limit, memory_limit, disk_limit } = resources;
    const query = `
      UPDATE servers 
      SET cpu_limit = $1, memory_limit = $2, disk_limit = $3
      WHERE id = $4
      RETURNING *
    `;
    const result = await pool.query(query, [cpu_limit, memory_limit, disk_limit, id]);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE servers SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'UPDATE servers SET status = $1 WHERE id = $2';
    await pool.query(query, ['deleted', id]);
  }

  static async findAll(page = 1, limit = 20, userId = null, gameType = null, status = null) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT s.*, u.username, u.email 
      FROM servers s 
      LEFT JOIN users u ON s.user_id = u.id
    `;
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (userId) {
      conditions.push(`s.user_id = $${paramCount}`);
      values.push(userId);
      paramCount++;
    }

    if (gameType) {
      conditions.push(`s.game_type = $${paramCount}`);
      values.push(gameType);
      paramCount++;
    }

    if (status) {
      conditions.push(`s.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    } else {
      conditions.push(`s.status != $${paramCount}`);
      values.push('deleted');
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM servers s';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await pool.query(countQuery, values.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    return {
      servers: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = Server;

