const pool = require('../config/database');

// How long after a scan someone is assumed to still be in the building.
const PRESENCE_WINDOW_MINUTES = 90;

/**
 * The live state of the complex.
 *
 * Every figure here already existed in Postgres and was never shown to
 * anyone — check-ins, bookings, rooms, open tabs. A venue that can say what
 * is happening inside it right now doesn't need to manufacture urgency.
 *
 * Deliberately public and deliberately vague where it should be: headcounts
 * are expressed as a band, never an exact number, and an empty lounge is
 * reported as "open" rather than "nobody here" — accurate, without
 * advertising a quiet night.
 */
class VenuePulse {
  static async snapshot() {
    const { rows } = await pool.query(`
      WITH now_local AS (SELECT NOW() AS ts, CURRENT_DATE AS today),
      -- Anyone who scanned in within the presence window is treated as still on site.
      gym AS (
        SELECT
          (SELECT COUNT(DISTINCT ci.user_id)
             FROM membership_check_ins ci
             JOIN facilities f ON f.id = ci.facility_id
            WHERE f.slug = 'gym'
              AND ci.checked_in_at > NOW() - ($1 || ' minutes')::interval
          ) AS present,
          (SELECT capacity FROM facilities WHERE slug = 'gym') AS capacity
      ),
      -- Whole-hour slots left on the pitch between now and closing.
      pitch AS (
        SELECT
          GREATEST(
            0,
            (SELECT FLOOR(EXTRACT(EPOCH FROM (
                       LEAST(f.closing_time, TIME '23:59')
                       - GREATEST(f.opening_time, LOCALTIME)
                     )) / 3600)::int
               FROM facilities f WHERE f.slug = 'football-ground')
            - (SELECT COUNT(*)::int
                 FROM bookings b
                 JOIN facilities f ON f.id = b.facility_id
                WHERE f.slug = 'football-ground'
                  AND b.booking_date = CURRENT_DATE
                  AND b.status IN ('pending', 'confirmed'))
          ) AS slots_left
      ),
      -- Rooms with no stay spanning tonight.
      hotel AS (
        SELECT
          (SELECT COUNT(*)::int FROM rooms r
             JOIN facilities f ON f.id = r.facility_id
            WHERE f.slug = 'hotel' AND r.is_active
              AND NOT EXISTS (
                SELECT 1 FROM bookings b
                 WHERE b.room_id = r.id
                   AND b.status IN ('pending', 'confirmed')
                   AND b.booking_date <= CURRENT_DATE
                   AND b.check_out_date > CURRENT_DATE
              )) AS rooms_free,
          (SELECT MIN(r.price_per_night) FROM rooms r
             JOIN facilities f ON f.id = r.facility_id
            WHERE f.slug = 'hotel' AND r.is_active) AS from_price
      ),
      lounge AS (
        SELECT (SELECT COUNT(*)::int FROM orders
                 WHERE status IN ('placed', 'preparing')) AS live_orders
      ),
      hours AS (
        SELECT opening_time, closing_time FROM facilities WHERE slug = 'gym'
      )
      SELECT
        (SELECT present FROM gym)        AS gym_present,
        (SELECT capacity FROM gym)       AS gym_capacity,
        (SELECT slots_left FROM pitch)   AS pitch_slots_left,
        (SELECT rooms_free FROM hotel)   AS rooms_free,
        (SELECT from_price FROM hotel)   AS rooms_from,
        (SELECT live_orders FROM lounge) AS live_orders,
        (SELECT opening_time FROM hours) AS opening_time,
        (SELECT closing_time FROM hours) AS closing_time
    `, [PRESENCE_WINDOW_MINUTES]);

    const r = rows[0];
    const capacity = Number(r.gym_capacity) || 1;
    const present = Number(r.gym_present) || 0;
    const occupancy = Math.min(100, Math.round((present / capacity) * 100));

    // A percentage invites the question "how do you know?"; a band is what a
    // person actually wants — can I get on a machine or not.
    const busyness =
      occupancy >= 70 ? 'busy' : occupancy >= 30 ? 'steady' : 'quiet';

    const nowTime = new Date().toTimeString().slice(0, 8);
    const open =
      nowTime >= String(r.opening_time) && nowTime < String(r.closing_time);

    return {
      open,
      opensAt: r.opening_time,
      closesAt: r.closing_time,
      gym: { occupancy, busyness, capacity },
      football: { slotsLeftToday: Number(r.pitch_slots_left) || 0 },
      hotel: {
        roomsFreeTonight: Number(r.rooms_free) || 0,
        fromPrice: r.rooms_from,
      },
      lounge: { liveOrders: Number(r.live_orders) || 0 },
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = VenuePulse;
