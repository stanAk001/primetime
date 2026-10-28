const pool = require('../config/database');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// A table that already has a call waiting doesn't need a second one — this
// stops a bored table hammering the button and burying the real calls, the
// same way membership check-ins are de-duplicated.
const DEDUPE_WINDOW_SECONDS = 90;

class WaiterCall {
  static async create({ facilitySlug, tableLabel, note }) {
    const facilityRes = await pool.query(
      'SELECT id, name FROM facilities WHERE slug = $1 AND is_active = true',
      [facilitySlug]
    );
    const facility = facilityRes.rows[0];
    if (!facility) throw httpError(404, 'Facility not found');

    const existing = await pool.query(
      `SELECT id, created_at FROM waiter_calls
       WHERE facility_id = $1
         AND lower(table_label) = lower($2)
         AND status IN ('pending', 'acknowledged')
         AND created_at > NOW() - ($3 || ' seconds')::interval
       ORDER BY created_at DESC
       LIMIT 1`,
      [facility.id, tableLabel, DEDUPE_WINDOW_SECONDS]
    );
    if (existing.rows.length > 0) {
      return { call: existing.rows[0], duplicate: true };
    }

    const { rows } = await pool.query(
      `INSERT INTO waiter_calls (facility_id, table_label, note)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [facility.id, tableLabel, note || null]
    );
    return { call: rows[0], duplicate: false };
  }

  static async findAll({ status, since } = {}) {
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`wc.status = $${params.length}`);
    }
    if (since) {
      params.push(since);
      conditions.push(`wc.created_at > $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT wc.*, f.name AS facility_name, f.slug AS facility_slug
       FROM waiter_calls wc
       JOIN facilities f ON f.id = wc.facility_id
       ${where}
       ORDER BY
         CASE wc.status WHEN 'pending' THEN 0 WHEN 'acknowledged' THEN 1 ELSE 2 END,
         wc.created_at DESC
       LIMIT 100`,
      params
    );
    return rows;
  }

  static async pendingCount() {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM waiter_calls WHERE status = 'pending'"
    );
    return rows[0].count;
  }

  static async updateStatus(id, status) {
    if (!['pending', 'acknowledged', 'resolved'].includes(status)) {
      throw httpError(400, 'Invalid status');
    }

    const stamp =
      status === 'acknowledged'
        ? ', acknowledged_at = CURRENT_TIMESTAMP'
        : status === 'resolved'
          ? ', resolved_at = CURRENT_TIMESTAMP'
          : '';

    const { rows } = await pool.query(
      `UPDATE waiter_calls SET status = $2${stamp} WHERE id = $1 RETURNING *`,
      [id, status]
    );
    if (!rows[0]) throw httpError(404, 'Call not found');
    return rows[0];
  }
}

module.exports = WaiterCall;
