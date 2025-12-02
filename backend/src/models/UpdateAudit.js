const pool = require('../config/database');

class UpdateAudit {
  static async create(auditData) {
    const {
      initiated_by,
      status = 'pending',
      previous_commit,
      new_commit,
      logs = [],
      error_message
    } = auditData;

    const query = `
      INSERT INTO update_audit (initiated_by, status, previous_commit, new_commit, logs, error_message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      initiated_by,
      status,
      previous_commit,
      new_commit,
      JSON.stringify(logs),
      error_message
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM update_audit WHERE id = $1';
    const result = await pool.query(query, [id]);
    if (result.rows[0]) {
      result.rows[0].logs = JSON.parse(result.rows[0].logs || '[]');
    }
    return result.rows[0];
  }

  static async update(id, updateData) {
    const {
      status,
      new_commit,
      logs,
      error_message,
      completed_at,
      duration_seconds
    } = updateData;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }
    if (new_commit !== undefined) {
      updates.push(`new_commit = $${paramCount}`);
      values.push(new_commit);
      paramCount++;
    }
    if (logs !== undefined) {
      updates.push(`logs = $${paramCount}`);
      values.push(JSON.stringify(logs));
      paramCount++;
    }
    if (error_message !== undefined) {
      updates.push(`error_message = $${paramCount}`);
      values.push(error_message);
      paramCount++;
    }
    if (completed_at !== undefined) {
      updates.push(`completed_at = $${paramCount}`);
      values.push(completed_at);
      paramCount++;
    }
    if (duration_seconds !== undefined) {
      updates.push(`duration_seconds = $${paramCount}`);
      values.push(duration_seconds);
      paramCount++;
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE update_audit
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    if (result.rows[0]) {
      result.rows[0].logs = JSON.parse(result.rows[0].logs || '[]');
    }
    return result.rows[0];
  }

  static async findAll(limit = 50) {
    const query = `
      SELECT * FROM update_audit
      ORDER BY started_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    
    // Parse logs JSON for each row
    return result.rows.map(row => ({
      ...row,
      logs: JSON.parse(row.logs || '[]')
    }));
  }

  static async findLatest() {
    const query = `
      SELECT * FROM update_audit
      ORDER BY started_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query);
    if (result.rows[0]) {
      result.rows[0].logs = JSON.parse(result.rows[0].logs || '[]');
    }
    return result.rows[0];
  }

  static async findByStatus(status) {
    const query = `
      SELECT * FROM update_audit
      WHERE status = $1
      ORDER BY started_at DESC
    `;
    const result = await pool.query(query, [status]);
    
    return result.rows.map(row => ({
      ...row,
      logs: JSON.parse(row.logs || '[]')
    }));
  }
}

module.exports = UpdateAudit;

