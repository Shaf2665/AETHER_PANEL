const pool = require('../config/database');

class RevenueTask {
  static async create(taskData) {
    const { user_id, task_type, task_id, coins_reward, expires_at } = taskData;
    const query = `
      INSERT INTO revenue_tasks (user_id, task_type, task_id, coins_reward, status, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [user_id, task_type, task_id, coins_reward, 'pending', expires_at];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId, status = null) {
    let query = 'SELECT * FROM revenue_tasks WHERE user_id = $1';
    const values = [userId];
    
    if (status) {
      query += ' AND status = $2';
      values.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM revenue_tasks WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByTaskId(taskId) {
    const query = 'SELECT * FROM revenue_tasks WHERE task_id = $1';
    const result = await pool.query(query, [taskId]);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE revenue_tasks 
      SET status = $1, completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async expireOldTasks() {
    const query = `
      UPDATE revenue_tasks 
      SET status = 'expired' 
      WHERE status = 'pending' AND expires_at < NOW()
    `;
    await pool.query(query);
  }
}

module.exports = RevenueTask;

