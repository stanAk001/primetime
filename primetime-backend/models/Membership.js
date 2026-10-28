const pool = require('../config/database');
const crypto = require('crypto');
const { REGISTRATION_FEE } = require('./GymProfile');

const generateQrCode = () => crypto.randomBytes(16).toString('hex');

const MEMBERSHIP_WITH_DETAILS = `
  SELECT m.*, p.name AS plan_name, p.duration_days,
         f.name AS facility_name, f.slug AS facility_slug,
         (m.status = 'active' AND m.expires_at >= CURRENT_DATE) AS is_valid_now
  FROM memberships m
  JOIN membership_plans p ON p.id = m.plan_id
  JOIN facilities f ON f.id = m.facility_id
`;

class Membership {
  // Has this user completed enrollment (profile + paid ₦5,000 fee) for
  // this facility? Registration is now its own step, tracked on the
  // gym_profiles row — plans can only be bought after it.
  static async hasRegistered(userId, facilityId) {
    const result = await pool.query(
      `SELECT 1 FROM gym_profiles
       WHERE user_id = $1 AND facility_id = $2 AND registration_fee_paid = true
       LIMIT 1`,
      [userId, facilityId]
    );
    return result.rows.length > 0;
  }

  // Creates a pending membership priced at plan price only — the
  // registration fee was already collected during enrollment, which is
  // required before this point. Activation — setting starts_at/expires_at
  // and flipping status to 'active' — happens only on successful payment,
  // inline inside Payment.markSuccess.
  static async create({ userId, facilityId, planId }) {
    const planRes = await pool.query(
      'SELECT * FROM membership_plans WHERE id = $1 AND facility_id = $2 AND is_active = true',
      [planId, facilityId]
    );
    const plan = planRes.rows[0];
    if (!plan) {
      const err = new Error('Membership plan not found');
      err.status = 404;
      throw err;
    }

    if (!(await this.hasRegistered(userId, facilityId))) {
      const err = new Error(
        'Complete your gym registration (one-time ₦5,000) before choosing a plan'
      );
      err.status = 403;
      throw err;
    }

    const result = await pool.query(
      `INSERT INTO memberships
         (user_id, facility_id, plan_id, qr_code, total_amount, registration_fee_paid)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [userId, facilityId, planId, generateQrCode(), Number(plan.price).toFixed(2)]
    );
    return { membership: result.rows[0], plan };
  }

  static async findById(id) {
    const result = await pool.query(`${MEMBERSHIP_WITH_DETAILS} WHERE m.id = $1`, [id]);
    return result.rows[0];
  }

  static async findByUser(userId) {
    const result = await pool.query(
      `${MEMBERSHIP_WITH_DETAILS} WHERE m.user_id = $1 ORDER BY m.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Front-desk lookup: everything staff need at a glance — validity,
  // plan window, and the member's enrollment profile (goals, weight).
  static async verifyAccess(qrCode) {
    const result = await pool.query(
      `SELECT m.id AS membership_id, m.user_id, m.facility_id,
              m.status, m.starts_at, m.expires_at,
              (m.status = 'active' AND m.expires_at >= CURRENT_DATE) AS is_valid_now,
              (m.expires_at - CURRENT_DATE) AS days_left,
              p.name AS plan_name, p.duration_days,
              u.first_name, u.last_name, u.profile_image_url, u.phone,
              gp.full_name AS profile_name,
              gp.goals, gp.weight_kg, gp.target_weight_kg, gp.gender
       FROM memberships m
       JOIN membership_plans p ON p.id = m.plan_id
       JOIN users u ON u.id = m.user_id
       LEFT JOIN gym_profiles gp
         ON gp.user_id = m.user_id AND gp.facility_id = m.facility_id
       WHERE m.qr_code = $1`,
      [qrCode]
    );
    return result.rows[0];
  }

  // Attendance context for the scan screen: lifetime visits, visits this
  // week, and the previous visit (before today's scan is recorded).
  static async checkInStats(userId, facilityId) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (
                WHERE checked_in_at >= date_trunc('week', CURRENT_TIMESTAMP)
              )::int AS this_week,
              MAX(checked_in_at) AS last_visit
       FROM membership_check_ins
       WHERE user_id = $1 AND facility_id = $2`,
      [userId, facilityId]
    );
    return result.rows[0];
  }

  // Logs a valid scan. Deduped: the same membership scanning again
  // within 10 minutes (double-beep, phone still in frame) is one visit.
  static async recordCheckIn({ membership_id, user_id, facility_id }) {
    const result = await pool.query(
      `INSERT INTO membership_check_ins (membership_id, user_id, facility_id)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM membership_check_ins
         WHERE membership_id = $1
           AND checked_in_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes'
       )
       RETURNING *`,
      [membership_id, user_id, facility_id]
    );
    return result.rows[0] ?? null;
  }

  // First day this person was ever an active member here.
  static async memberSince(userId, facilityId) {
    const result = await pool.query(
      `SELECT MIN(starts_at) AS member_since
       FROM memberships
       WHERE user_id = $1 AND facility_id = $2 AND starts_at IS NOT NULL`,
      [userId, facilityId]
    );
    return result.rows[0]?.member_since ?? null;
  }

  static async adminFindAll({ status, search, limit = 50, offset = 0 } = {}) {
    const params = [];
    const conditions = [];
    if (status) {
      params.push(status);
      conditions.push(`m.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(u.email ILIKE $${params.length} OR u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length})`
      );
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT m.*, p.name AS plan_name, p.duration_days,
              f.name AS facility_name,
              u.email AS user_email, u.first_name, u.last_name,
              (m.status = 'active' AND m.expires_at >= CURRENT_DATE) AS is_valid_now
       FROM memberships m
       JOIN membership_plans p ON p.id = m.plan_id
       JOIN facilities f ON f.id = m.facility_id
       JOIN users u ON u.id = m.user_id
       ${where}
       ORDER BY m.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return result.rows;
  }
}

module.exports = Membership;
module.exports.REGISTRATION_FEE = REGISTRATION_FEE;
