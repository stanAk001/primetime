const pool = require('../config/database');

class Payment {
  // Funds exactly one of a session booking, a gym membership period, or
  // a one-time gym registration — pass whichever id applies.
  static async create({
    bookingId,
    membershipId,
    gymProfileId,
    userId,
    amount,
    currency = 'NGN',
    reference,
  }) {
    const result = await pool.query(
      `INSERT INTO payments
         (booking_id, membership_id, gym_profile_id, user_id, amount, currency, paystack_reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        bookingId ?? null,
        membershipId ?? null,
        gymProfileId ?? null,
        userId,
        amount,
        currency,
        reference,
      ]
    );
    return result.rows[0];
  }

  static async findByReference(reference) {
    const result = await pool.query(
      'SELECT * FROM payments WHERE paystack_reference = $1',
      [reference]
    );
    return result.rows[0];
  }

  static async hasSuccessfulPayment(bookingId) {
    const result = await pool.query(
      `SELECT 1 FROM payments WHERE booking_id = $1 AND status = 'success' LIMIT 1`,
      [bookingId]
    );
    return result.rows.length > 0;
  }

  // Marks a payment successful and, atomically, confirms its booking or
  // activates its membership — whichever this payment funds.
  // Idempotent: returns null if the reference is unknown or already succeeded,
  // so verify + webhook can both fire without double-processing.
  static async markSuccess(reference, paystackData = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const payRes = await client.query(
        `UPDATE payments
         SET status = 'success',
             paid_at = COALESCE($2::timestamptz, CURRENT_TIMESTAMP),
             metadata = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE paystack_reference = $1 AND status <> 'success'
         RETURNING *`,
        [reference, paystackData.paid_at ?? null, JSON.stringify(paystackData)]
      );
      const payment = payRes.rows[0];
      if (!payment) {
        await client.query('COMMIT');
        return null;
      }

      if (payment.booking_id) {
        await client.query(
          `UPDATE bookings SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND status = 'pending'`,
          [payment.booking_id]
        );
      } else if (payment.membership_id) {
        // Activate the membership: start today, or the day after any
        // still-valid membership on the same facility expires, so
        // renewing a little early never costs the member days.
        const pendingRes = await client.query(
          'SELECT user_id, facility_id FROM memberships WHERE id = $1',
          [payment.membership_id]
        );
        const pending = pendingRes.rows[0];

        const priorRes = pending
          ? await client.query(
              `SELECT expires_at FROM memberships
               WHERE user_id = $1 AND facility_id = $2 AND status = 'active'
                 AND expires_at >= CURRENT_DATE AND id <> $3
               ORDER BY expires_at DESC LIMIT 1`,
              [pending.user_id, pending.facility_id, payment.membership_id]
            )
          : { rows: [] };
        const priorExpiry = priorRes.rows[0]?.expires_at ?? null;

        await client.query(
          `UPDATE memberships m
           SET status = 'active',
               starts_at = GREATEST(CURRENT_DATE, COALESCE($2::date + 1, CURRENT_DATE)),
               expires_at = GREATEST(CURRENT_DATE, COALESCE($2::date + 1, CURRENT_DATE))
                            + (p.duration_days - 1) * INTERVAL '1 day',
               updated_at = CURRENT_TIMESTAMP
           FROM membership_plans p
           WHERE m.id = $1 AND m.plan_id = p.id AND m.status = 'pending'`,
          [payment.membership_id, priorExpiry]
        );
      } else if (payment.gym_profile_id) {
        // Registration fee cleared — the member can now buy plans.
        await client.query(
          `UPDATE gym_profiles
           SET registration_fee_paid = true,
               paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [payment.gym_profile_id]
        );
      }

      await client.query('COMMIT');
      return payment;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async markFailed(reference, reason, paystackData = {}) {
    const result = await pool.query(
      `UPDATE payments
       SET status = 'failed', failed_at = CURRENT_TIMESTAMP,
           failure_reason = $2, metadata = $3, updated_at = CURRENT_TIMESTAMP
       WHERE paystack_reference = $1 AND status = 'pending'
       RETURNING *`,
      [reference, reason ?? 'Payment failed', JSON.stringify(paystackData)]
    );
    return result.rows[0];
  }

  static async revenueAnalytics() {
    const totalsRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_revenue,
              COUNT(*) AS successful_payments
       FROM payments WHERE status = 'success'`
    );

    const byFacilityRes = await pool.query(
      `SELECT f.id, f.name, f.slug,
              COUNT(p.id) AS payments,
              COALESCE(SUM(p.amount), 0) AS revenue
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN facilities f ON f.id = b.facility_id
       WHERE p.status = 'success'
       GROUP BY f.id, f.name, f.slug
       ORDER BY revenue DESC`
    );

    const byMonthRes = await pool.query(
      `SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM') AS month,
              COALESCE(SUM(amount), 0) AS revenue,
              COUNT(*) AS payments
       FROM payments
       WHERE status = 'success' AND paid_at IS NOT NULL
       GROUP BY 1
       ORDER BY 1`
    );

    return {
      totalRevenue: totalsRes.rows[0].total_revenue,
      successfulPayments: Number(totalsRes.rows[0].successful_payments),
      byFacility: byFacilityRes.rows,
      byMonth: byMonthRes.rows,
    };
  }
}

module.exports = Payment;

