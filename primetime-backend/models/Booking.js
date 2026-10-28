const pool = require('../config/database');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// Normalize 'HH:MM' -> 'HH:MM:SS' so string comparison against pg TIME works.
const toTime = (t) => (t.length === 5 ? `${t}:00` : t);

const BOOKING_WITH_FACILITY = `
  SELECT b.*, f.name AS facility_name, f.slug AS facility_slug,
         f.category AS facility_category, f.currency
  FROM bookings b
  JOIN facilities f ON f.id = b.facility_id
`;

class Booking {
  // Creates a booking inside a transaction:
  // locks the facility row, checks capacity across overlapping bookings,
  // and computes total_amount server-side (price_per_session × guests).
  static async create({
    userId,
    facilityId,
    bookingDate,
    startTime,
    endTime,
    numberOfGuests,
    notes,
    roomId,
    checkOutDate,
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const facilityRes = await client.query(
        'SELECT * FROM facilities WHERE id = $1 FOR UPDATE',
        [facilityId]
      );
      const facility = facilityRes.rows[0];
      if (!facility || !facility.is_active) {
        throw httpError(404, 'Facility not found');
      }

      // Each facility is transacted its own way; only 'session' and 'room'
      // produce a booking at all.
      switch (facility.booking_mode) {
        case 'benefit':
          throw httpError(
            400,
            `${facility.name} is included with an active gym membership — no booking required`
          );
        case 'membership':
          throw httpError(
            400,
            `${facility.name} is membership-based — join via its membership plans instead of booking a session`
          );
        case 'walk_in':
          throw httpError(
            400,
            `${facility.name} is walk-in — no reservation needed. Order from the table menu when you arrive.`
          );
        default:
          break;
      }

      if (facility.booking_mode === 'room') {
        return await this.createRoomStay(client, {
          userId,
          facility,
          roomId,
          bookingDate,
          checkOutDate,
          numberOfGuests,
          notes,
        });
      }

      const start = toTime(startTime);
      const end = toTime(endTime);

      if (facility.capacity && numberOfGuests > facility.capacity) {
        throw httpError(
          400,
          `Facility capacity is ${facility.capacity} guests`
        );
      }

      // Opening-hours check (skipped for overnight facilities like the bar
      // lounge, whose closing time is past midnight).
      if (
        facility.opening_time &&
        facility.closing_time &&
        facility.opening_time < facility.closing_time &&
        (start < facility.opening_time || end > facility.closing_time)
      ) {
        throw httpError(
          400,
          `Facility is open ${facility.opening_time} – ${facility.closing_time}`
        );
      }

      // Guests already booked into any overlapping slot on that date.
      const overlapRes = await client.query(
        `SELECT COALESCE(SUM(number_of_guests), 0) AS booked
         FROM bookings
         WHERE facility_id = $1
           AND booking_date = $2
           AND status IN ('pending', 'confirmed')
           AND start_time < $4 AND end_time > $3`,
        [facilityId, bookingDate, start, end]
      );
      const booked = Number(overlapRes.rows[0].booked);
      if (facility.capacity && booked + numberOfGuests > facility.capacity) {
        const left = Math.max(facility.capacity - booked, 0);
        throw httpError(
          409,
          `Not enough capacity for this slot — ${left} spot(s) left`
        );
      }

      const totalAmount = (
        Number(facility.price_per_session) * numberOfGuests
      ).toFixed(2);

      const insertRes = await client.query(
        `INSERT INTO bookings
           (user_id, facility_id, booking_date, start_time, end_time,
            number_of_guests, total_amount, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, facilityId, bookingDate, start, end, numberOfGuests, totalAmount, notes ?? null]
      );

      await client.query('COMMIT');
      return { booking: insertRes.rows[0], facility };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * A room stay: one room, from check-in to check-out, priced by night.
   *
   * Runs inside the caller's open transaction, and the room row is locked so
   * two people can't take the last night of the same suite at once. Nothing
   * here is per-guest — a room costs what the room costs.
   */
  static async createRoomStay(
    client,
    { userId, facility, roomId, bookingDate, checkOutDate, numberOfGuests, notes }
  ) {
    if (!roomId) throw httpError(400, 'Choose a room first');
    if (!checkOutDate) throw httpError(400, 'Check-out date is required');
    if (checkOutDate <= bookingDate) {
      throw httpError(400, 'Check-out must be after check-in');
    }

    const roomRes = await client.query(
      'SELECT * FROM rooms WHERE id = $1 AND facility_id = $2 FOR UPDATE',
      [roomId, facility.id]
    );
    const room = roomRes.rows[0];
    if (!room || !room.is_active) throw httpError(404, 'Room not found');

    if (room.capacity && numberOfGuests > room.capacity) {
      throw httpError(
        400,
        `${room.name} sleeps ${room.capacity} — pick a larger room or split the party`
      );
    }

    // Two stays clash when each starts before the other ends. Check-out day
    // is free for the next guest, so the comparison is strictly exclusive.
    const clashRes = await client.query(
      `SELECT 1 FROM bookings
       WHERE room_id = $1
         AND status IN ('pending', 'confirmed')
         AND booking_date < $3
         AND check_out_date > $2
       LIMIT 1`,
      [roomId, bookingDate, checkOutDate]
    );
    if (clashRes.rows.length > 0) {
      throw httpError(409, `${room.name} is already taken for those dates`);
    }

    const nights = Math.round(
      (new Date(checkOutDate) - new Date(bookingDate)) / 86400000
    );
    const totalAmount = (Number(room.price_per_night) * nights).toFixed(2);

    const insertRes = await client.query(
      `INSERT INTO bookings
         (user_id, facility_id, room_id, booking_date, check_out_date,
          number_of_guests, total_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        facility.id,
        roomId,
        bookingDate,
        checkOutDate,
        numberOfGuests,
        totalAmount,
        notes ?? null,
      ]
    );

    await client.query('COMMIT');
    return { booking: insertRes.rows[0], facility, room, nights };
  }

  static async findByUser(userId, { status } = {}) {
    const params = [userId];
    let where = 'WHERE b.user_id = $1';
    if (status) {
      params.push(status);
      where += ` AND b.status = $${params.length}`;
    }
    const result = await pool.query(
      `${BOOKING_WITH_FACILITY} ${where}
       ORDER BY b.booking_date DESC, b.start_time DESC`,
      params
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `${BOOKING_WITH_FACILITY} WHERE b.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE bookings SET status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id, status]
    );
    return result.rows[0];
  }

  static async cancel(id, reason) {
    const result = await pool.query(
      `UPDATE bookings
       SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP,
           cancellation_reason = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, reason ?? null]
    );
    return result.rows[0];
  }

  static async findAllAdmin({ status, date, limit = 50, offset = 0 } = {}) {
    const params = [];
    const conditions = [];
    if (status) {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }
    if (date) {
      params.push(date);
      conditions.push(`b.booking_date = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT b.*, f.name AS facility_name, f.slug AS facility_slug,
              u.email AS user_email, u.first_name, u.last_name
       FROM bookings b
       JOIN facilities f ON f.id = b.facility_id
       JOIN users u ON u.id = b.user_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return result.rows;
  }
}

module.exports = Booking;
