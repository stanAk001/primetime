const pool = require('../config/database');

class Room {
  static async findByFacilitySlug(slug, { includeInactive = false } = {}) {
    const { rows } = await pool.query(
      `SELECT r.*
       FROM rooms r
       JOIN facilities f ON f.id = r.facility_id
       WHERE f.slug = $1 AND ($2::boolean OR r.is_active = true)
       ORDER BY r.display_order NULLS LAST, r.price_per_night`,
      [slug, includeInactive]
    );
    return rows;
  }

  static async findBySlug(facilitySlug, roomSlug) {
    const { rows } = await pool.query(
      `SELECT r.*
       FROM rooms r
       JOIN facilities f ON f.id = r.facility_id
       WHERE f.slug = $1 AND r.slug = $2`,
      [facilitySlug, roomSlug]
    );
    return rows[0];
  }
}

module.exports = Room;
