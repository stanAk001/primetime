const pool = require('../config/database');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The hotel's headline price is the cheapest room, not a per-session rate, so
// cards can read "from ₦35,000 / night" without a second request. Null for
// every facility that has no rooms.
const WITH_MIN_ROOM_PRICE = `
  (SELECT MIN(r.price_per_night) FROM rooms r
    WHERE r.facility_id = facilities.id AND r.is_active = true) AS min_room_price
`;

class Facility {
  static async findAll({ category, includeInactive = false } = {}) {
    const conditions = [];
    const params = [];

    if (!includeInactive) conditions.push('is_active = true');
    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT *, ${WITH_MIN_ROOM_PRICE} FROM facilities ${where}
       ORDER BY display_order NULLS LAST, name`,
      params
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT *, ${WITH_MIN_ROOM_PRICE} FROM facilities WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findBySlug(slug) {
    const result = await pool.query(
      `SELECT *, ${WITH_MIN_ROOM_PRICE} FROM facilities WHERE slug = $1`,
      [slug]
    );
    return result.rows[0];
  }

  // Accepts either a UUID or a slug — the frontend links by slug.
  static async findByIdOrSlug(idOrSlug) {
    return UUID_PATTERN.test(idOrSlug)
      ? this.findById(idOrSlug)
      : this.findBySlug(idOrSlug);
  }

  static async getMedia(facilityId) {
    const result = await pool.query(
      'SELECT * FROM facility_media WHERE facility_id = $1 ORDER BY display_order',
      [facilityId]
    );
    return result.rows;
  }

  static async create(data) {
    const result = await pool.query(
      `INSERT INTO facilities
         (name, slug, category, description, long_description, capacity,
          price_per_session, currency, amenities, opening_time, closing_time,
          is_active, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.name,
        data.slug,
        data.category,
        data.description ?? null,
        data.longDescription ?? null,
        data.capacity ?? null,
        data.pricePerSession ?? null,
        data.currency ?? 'NGN',
        JSON.stringify(data.amenities ?? []),
        data.openingTime ?? null,
        data.closingTime ?? null,
        data.isActive ?? true,
        data.displayOrder ?? null,
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    // Map camelCase API fields to snake_case columns; only set provided keys.
    const columnMap = {
      name: 'name',
      slug: 'slug',
      category: 'category',
      description: 'description',
      longDescription: 'long_description',
      capacity: 'capacity',
      pricePerSession: 'price_per_session',
      currency: 'currency',
      amenities: 'amenities',
      openingTime: 'opening_time',
      closingTime: 'closing_time',
      isActive: 'is_active',
      displayOrder: 'display_order',
    };

    const sets = [];
    const params = [id];

    for (const [field, column] of Object.entries(columnMap)) {
      if (data[field] === undefined) continue;
      const value =
        field === 'amenities' ? JSON.stringify(data[field]) : data[field];
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    }

    if (sets.length === 0) return this.findById(id);

    const result = await pool.query(
      `UPDATE facilities
       SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      params
    );
    return result.rows[0];
  }
}

module.exports = Facility;
