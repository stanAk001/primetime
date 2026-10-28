const pool = require('../config/database');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeReference = () =>
  'MN' +
  Array.from(
    { length: 5 },
    () => REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)]
  ).join('');

class MatchNight {
  // Upcoming fixtures with how much of the room is already spoken for, so
  // the page can show "filling up" honestly rather than as a sales tactic.
  static async upcoming({ limit = 12 } = {}) {
    const { rows } = await pool.query(
      `SELECT f.*,
              COALESCE(SUM(r.party_size) FILTER (WHERE r.status IN ('reserved','seated')), 0)::int AS seats_taken,
              (SELECT capacity FROM facilities WHERE slug = 'bar-lounge') AS room_capacity
         FROM fixtures f
         LEFT JOIN fixture_reservations r ON r.fixture_id = f.id
        WHERE f.is_active
          AND f.kickoff_at > NOW() - INTERVAL '3 hours'
        GROUP BY f.id
        ORDER BY f.kickoff_at
        LIMIT $1`,
      [limit]
    );
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM fixtures WHERE id = $1', [id]);
    return rows[0];
  }

  static async packages() {
    const { rows } = await pool.query(
      'SELECT * FROM match_packages WHERE is_active ORDER BY display_order NULLS LAST, price'
    );
    return rows;
  }

  /**
   * Holds a table for a fixture.
   *
   * Public and unpaid on purpose — the lounge does not take money up front,
   * and a match night is still the lounge. What it does take is the room's
   * remaining capacity seriously: the count is re-checked inside the
   * transaction so two large parties can't both take the last ten seats.
   */
  static async reserve({ fixtureId, packageId, guestName, phone, partySize, note }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fixtureRes = await client.query(
        'SELECT * FROM fixtures WHERE id = $1 AND is_active FOR UPDATE',
        [fixtureId]
      );
      const fixture = fixtureRes.rows[0];
      if (!fixture) throw httpError(404, 'That fixture is not on');
      if (new Date(fixture.kickoff_at) < new Date()) {
        throw httpError(400, 'That match has already kicked off');
      }

      const capRes = await client.query(
        `SELECT (SELECT capacity FROM facilities WHERE slug = 'bar-lounge') AS capacity,
                COALESCE(SUM(party_size) FILTER (WHERE status IN ('reserved','seated')), 0)::int AS taken
           FROM fixture_reservations WHERE fixture_id = $1`,
        [fixtureId]
      );
      const { capacity, taken } = capRes.rows[0];
      if (capacity && taken + partySize > capacity) {
        const left = Math.max(capacity - taken, 0);
        throw httpError(
          409,
          left > 0
            ? `Only ${left} seat(s) left for this match`
            : 'This match night is fully booked'
        );
      }

      if (packageId) {
        const pkg = await client.query(
          'SELECT 1 FROM match_packages WHERE id = $1 AND is_active',
          [packageId]
        );
        if (pkg.rows.length === 0) throw httpError(400, 'That package is no longer available');
      }

      const { rows } = await client.query(
        `INSERT INTO fixture_reservations
           (fixture_id, package_id, guest_name, phone, party_size, reference, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [fixtureId, packageId || null, guestName, phone, partySize, makeReference(), note || null]
      );

      await client.query('COMMIT');
      return { reservation: rows[0], fixture };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async adminReservations({ fixtureId } = {}) {
    const params = [];
    let where = '';
    if (fixtureId) {
      params.push(fixtureId);
      where = `WHERE r.fixture_id = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT r.*, f.home_team, f.away_team, f.kickoff_at, p.name AS package_name
         FROM fixture_reservations r
         JOIN fixtures f ON f.id = r.fixture_id
         LEFT JOIN match_packages p ON p.id = r.package_id
         ${where}
        ORDER BY f.kickoff_at, r.created_at
        LIMIT 200`,
      params
    );
    return rows;
  }

  static async updateReservation(id, status) {
    if (!['reserved', 'seated', 'cancelled', 'no_show'].includes(status)) {
      throw httpError(400, 'Invalid status');
    }
    const { rows } = await pool.query(
      `UPDATE fixture_reservations SET status = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 RETURNING *`,
      [id, status]
    );
    if (!rows[0]) throw httpError(404, 'Reservation not found');
    return rows[0];
  }
}

module.exports = MatchNight;
