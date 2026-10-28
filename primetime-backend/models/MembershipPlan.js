const pool = require('../config/database');

class MembershipPlan {
  static async findAll({ facilitySlug, includeInactive = false } = {}) {
    const params = [];
    const conditions = [];
    if (!includeInactive) conditions.push('mp.is_active = true');
    if (facilitySlug) {
      params.push(facilitySlug);
      conditions.push(`f.slug = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT mp.*, f.slug AS facility_slug
       FROM membership_plans mp
       JOIN facilities f ON f.id = mp.facility_id
       ${where}
       ORDER BY mp.display_order NULLS LAST, mp.duration_days`,
      params
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM membership_plans WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const result = await pool.query(
      `INSERT INTO membership_plans
         (facility_id, name, duration_days, price, currency, is_active, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.facilityId,
        data.name,
        data.durationDays,
        data.price,
        data.currency ?? 'NGN',
        data.isActive ?? true,
        data.displayOrder ?? null,
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const columnMap = {
      name: 'name',
      durationDays: 'duration_days',
      price: 'price',
      currency: 'currency',
      isActive: 'is_active',
      displayOrder: 'display_order',
    };

    const sets = [];
    const params = [id];
    for (const [field, column] of Object.entries(columnMap)) {
      if (data[field] === undefined) continue;
      params.push(data[field]);
      sets.push(`${column} = $${params.length}`);
    }
    if (sets.length === 0) return this.findById(id);

    const result = await pool.query(
      `UPDATE membership_plans
       SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      params
    );
    return result.rows[0];
  }
}

module.exports = MembershipPlan;
