const pool = require('../config/database');

class Menu {
  // The whole card in one round trip, nested category -> items. A walk-in on
  // mobile data shouldn't pay for six requests to read a drinks list.
  static async findByFacilitySlug(slug, { includeUnavailable = false } = {}) {
    const { rows } = await pool.query(
      `SELECT mc.id, mc.name, mc.slug, mc.tagline, mc.media_key, mc.display_order,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', mi.id,
                    'name', mi.name,
                    'description', mi.description,
                    'price', mi.price,
                    'serving', mi.serving,
                    'media_key', mi.media_key,
                    'tags', mi.tags,
                    'is_available', mi.is_available
                  )
                  ORDER BY mi.display_order, mi.name
                ) FILTER (WHERE mi.id IS NOT NULL),
                '[]'
              ) AS items
       FROM menu_categories mc
       JOIN facilities f ON f.id = mc.facility_id
       LEFT JOIN menu_items mi
         ON mi.category_id = mc.id
        AND ($2::boolean OR mi.is_available = true)
       WHERE f.slug = $1
       GROUP BY mc.id
       ORDER BY mc.display_order NULLS LAST, mc.name`,
      [slug, includeUnavailable]
    );
    return rows;
  }
}

module.exports = Menu;
