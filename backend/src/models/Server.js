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
}

module.exports = Server;

