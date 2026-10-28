const pool = require('../config/database');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// Short, unambiguous on a printed ticket and easy to read out across a noisy
// room. No 0/O or 1/I.
const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeReference = () =>
  Array.from(
    { length: 6 },
    () => REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)]
  ).join('');

const ORDER_WITH_ITEMS = `
  SELECT o.*, f.name AS facility_name, f.slug AS facility_slug,
         COALESCE(
           json_agg(
             json_build_object(
               'id', oi.id,
               'name', oi.name_snapshot,
               'unit_price', oi.unit_price,
               'quantity', oi.quantity,
               'line_total', oi.line_total
             ) ORDER BY oi.name_snapshot
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'
         ) AS items
  FROM orders o
  JOIN facilities f ON f.id = o.facility_id
  LEFT JOIN order_items oi ON oi.order_id = o.id
`;

class Order {
  /**
   * Places a tab from the table.
   *
   * Prices are read from the database, never from the request — the client
   * sends menu item ids and quantities only, so a tampered cart can't set
   * its own totals.
   */
  static async create({ facilitySlug, tableLabel, note, lines, clientRef }) {
    // A retry of an order we already took: hand back the original rather
    // than pouring a second round. This is the whole reason offline ordering
    // is safe to attempt at all.
    if (clientRef) {
      const existing = await pool.query(
        `${ORDER_WITH_ITEMS} WHERE o.client_ref = $1 GROUP BY o.id, f.name, f.slug`,
        [clientRef]
      );
      if (existing.rows[0]) {
        return { order: existing.rows[0], duplicate: true };
      }
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      throw httpError(400, 'Your order is empty');
    }
    if (lines.length > 40) {
      throw httpError(400, 'That is too many separate items for one order');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const facilityRes = await client.query(
        'SELECT id, name FROM facilities WHERE slug = $1 AND is_active = true',
        [facilitySlug]
      );
      const facility = facilityRes.rows[0];
      if (!facility) throw httpError(404, 'Facility not found');

      // Collapse duplicates so two taps of the same drink become quantity 2.
      const wanted = new Map();
      for (const line of lines) {
        const qty = Number(line.quantity);
        if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
          throw httpError(400, 'Quantities must be between 1 and 99');
        }
        wanted.set(line.menuItemId, (wanted.get(line.menuItemId) ?? 0) + qty);
      }

      const ids = [...wanted.keys()];
      const itemsRes = await client.query(
        `SELECT mi.id, mi.name, mi.price, mi.is_available
         FROM menu_items mi
         JOIN menu_categories mc ON mc.id = mi.category_id
         WHERE mi.id = ANY($1::uuid[]) AND mc.facility_id = $2`,
        [ids, facility.id]
      );
      if (itemsRes.rows.length !== ids.length) {
        throw httpError(400, 'One of those items is no longer on the menu');
      }
      const unavailable = itemsRes.rows.find((r) => !r.is_available);
      if (unavailable) {
        throw httpError(409, `${unavailable.name} is finished for tonight`);
      }

      let total = 0;
      const rows = itemsRes.rows.map((item) => {
        const quantity = wanted.get(item.id);
        const lineTotal = Number(item.price) * quantity;
        total += lineTotal;
        return { item, quantity, lineTotal };
      });

      const orderRes = await client.query(
        `INSERT INTO orders (facility_id, table_label, reference, total_amount, note, client_ref)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [facility.id, tableLabel, makeReference(), total.toFixed(2), note || null, clientRef || null]
      );
      const order = orderRes.rows[0];

      for (const { item, quantity, lineTotal } of rows) {
        await client.query(
          `INSERT INTO order_items
             (order_id, menu_item_id, name_snapshot, unit_price, quantity, line_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [order.id, item.id, item.name, item.price, quantity, lineTotal.toFixed(2)]
        );
      }

      await client.query('COMMIT');
      return {
        duplicate: false,
        order: {
          ...order,
          items: rows.map(({ item, quantity, lineTotal }) => ({
            name: item.name,
            unit_price: item.price,
            quantity,
            line_total: lineTotal,
          })),
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async findAll({ status } = {}) {
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE o.status = $${params.length}`;
    }
    const { rows } = await pool.query(
      `${ORDER_WITH_ITEMS} ${where}
       GROUP BY o.id, f.name, f.slug
       ORDER BY
         CASE o.status WHEN 'placed' THEN 0 WHEN 'preparing' THEN 1 ELSE 2 END,
         o.created_at DESC
       LIMIT 100`,
      params
    );
    return rows;
  }

  static async openCount() {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM orders WHERE status IN ('placed', 'preparing')"
    );
    return rows[0].count;
  }

  static async updateStatus(id, status) {
    if (!['placed', 'preparing', 'served', 'cancelled'].includes(status)) {
      throw httpError(400, 'Invalid status');
    }
    const { rows } = await pool.query(
      `UPDATE orders SET status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id, status]
    );
    if (!rows[0]) throw httpError(404, 'Order not found');
    return rows[0];
  }
}

module.exports = Order;
