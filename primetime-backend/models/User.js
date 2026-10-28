const pool = require('../config/database');

const PUBLIC_FIELDS =
  'id, email, first_name, last_name, phone, profile_image_url, membership_tier, is_active, created_at';

// Email addresses are case-insensitive in practice, and phone keyboards
// capitalise the first letter by default — so "Akeem@…" typed on a mobile
// would miss a row stored as "akeem@…" and come back as "Invalid
// credentials". Normalise on the way in and on every lookup.
const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

class User {
  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE lower(email) = $1',
      [normalizeEmail(email)]
    );
    return result.rows[0];
  }

  static async create(email, passwordHash, firstName, lastName, phone) {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${PUBLIC_FIELDS}`,
      [normalizeEmail(email), passwordHash, firstName, lastName, phone]
    );
    return result.rows[0];
  }

  static async findByGoogleId(googleId) {
    const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [
      googleId,
    ]);
    return result.rows[0];
  }

  // No password — Google has already verified the email, so there's
  // nothing to hash. profileImageUrl comes from the Google account and
  // is only used as a default; updateProfile can still override it later.
  static async createFromGoogle({ googleId, email, firstName, lastName, profileImageUrl }) {
    const result = await pool.query(
      `INSERT INTO users (google_id, email, first_name, last_name, profile_image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${PUBLIC_FIELDS}`,
      [googleId, normalizeEmail(email), firstName, lastName, profileImageUrl ?? null]
    );
    return result.rows[0];
  }

  // Attaches a Google identity to an existing password account that
  // shares its (Google-verified) email — same person signing in a new way.
  static async linkGoogleId(id, googleId) {
    const result = await pool.query(
      `UPDATE users SET google_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING ${PUBLIC_FIELDS}`,
      [id, googleId]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1 AND is_active = true`,
      [id]
    );
    return result.rows[0];
  }

  static async updateProfile(id, { firstName, lastName, phone, profileImageUrl }) {
    const result = await pool.query(
      `UPDATE users SET
         first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name),
         phone = COALESCE($4, phone),
         profile_image_url = COALESCE($5, profile_image_url),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING ${PUBLIC_FIELDS}`,
      [id, firstName, lastName, phone, profileImageUrl]
    );
    return result.rows[0];
  }

  static async updateLastLogin(id) {
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }
}

module.exports = User;
