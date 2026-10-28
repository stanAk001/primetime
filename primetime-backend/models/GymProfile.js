const pool = require('../config/database');

// One-time member enrollment fee — the gate on joining the gym at all.
// Paid once per member, before any plan can be purchased.
const REGISTRATION_FEE = 5000;

class GymProfile {
  static async findByUser(userId, facilityId) {
    const result = await pool.query(
      'SELECT * FROM gym_profiles WHERE user_id = $1 AND facility_id = $2',
      [userId, facilityId]
    );
    return result.rows[0];
  }

  // Create or refresh the member's enrollment details. Never touches
  // registration_fee_paid — only a successful payment flips that.
  static async upsert({
    userId,
    facilityId,
    fullName,
    phone,
    email,
    gender,
    dateOfBirth,
    weightKg,
    heightCm,
    targetWeightKg,
    goals,
    healthNotes,
    emergencyContactName,
    emergencyContactPhone,
  }) {
    const result = await pool.query(
      `INSERT INTO gym_profiles
         (user_id, facility_id, full_name, phone, email, gender, date_of_birth,
          weight_kg, height_cm, target_weight_kg, goals, health_notes,
          emergency_contact_name, emergency_contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (user_id, facility_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         gender = EXCLUDED.gender,
         date_of_birth = EXCLUDED.date_of_birth,
         weight_kg = EXCLUDED.weight_kg,
         height_cm = EXCLUDED.height_cm,
         target_weight_kg = EXCLUDED.target_weight_kg,
         goals = EXCLUDED.goals,
         health_notes = EXCLUDED.health_notes,
         emergency_contact_name = EXCLUDED.emergency_contact_name,
         emergency_contact_phone = EXCLUDED.emergency_contact_phone,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        userId,
        facilityId,
        fullName,
        phone,
        email,
        gender ?? null,
        dateOfBirth ?? null,
        weightKg ?? null,
        heightCm ?? null,
        targetWeightKg ?? null,
        JSON.stringify(goals ?? []),
        healthNotes ?? null,
        emergencyContactName ?? null,
        emergencyContactPhone ?? null,
      ]
    );
    return result.rows[0];
  }
}

module.exports = GymProfile;
module.exports.REGISTRATION_FEE = REGISTRATION_FEE;
