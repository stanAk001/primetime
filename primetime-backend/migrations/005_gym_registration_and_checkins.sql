-- Registration becomes a standalone first step: a member fills a gym
-- profile (contact, body metrics, training goals) and pays the ₦5,000
-- fee BEFORE any plan can be bought. Replaces the old model where the
-- fee was bundled into whichever plan was purchased first.

CREATE TABLE gym_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  gender VARCHAR(20),
  date_of_birth DATE,
  weight_kg DECIMAL(5, 1),
  height_cm DECIMAL(5, 1),
  target_weight_kg DECIMAL(5, 1),
  goals JSONB NOT NULL DEFAULT '[]',
  health_notes TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  registration_fee_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, facility_id)
);
CREATE INDEX idx_gym_profiles_user ON gym_profiles(user_id);

-- Payments can now fund a booking, a membership period, OR a
-- registration fee — exactly one of the three.
ALTER TABLE payments ADD COLUMN gym_profile_id UUID REFERENCES gym_profiles(id) ON DELETE CASCADE;
ALTER TABLE payments DROP CONSTRAINT payments_exactly_one_target;
ALTER TABLE payments ADD CONSTRAINT payments_exactly_one_target CHECK (
  (booking_id IS NOT NULL)::int
  + (membership_id IS NOT NULL)::int
  + (gym_profile_id IS NOT NULL)::int = 1
);
CREATE INDEX idx_payments_gym_profile_id ON payments(gym_profile_id);

-- Every valid front-desk scan is logged, giving staff live context
-- ("4th visit this week, last seen Tuesday") and the business real
-- attendance data.
CREATE TABLE membership_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_check_ins_membership ON membership_check_ins(membership_id, checked_in_at);
CREATE INDEX idx_check_ins_user_facility ON membership_check_ins(user_id, facility_id, checked_in_at);

-- Backfill: anyone whose first plan already bundled the old-style fee is
-- an existing member — give them a paid profile stub (details fillable
-- later) so they are never asked to register or pay ₦5,000 again.
INSERT INTO gym_profiles (user_id, facility_id, full_name, phone, email, registration_fee_paid, paid_at)
SELECT DISTINCT ON (m.user_id, m.facility_id)
  m.user_id,
  m.facility_id,
  COALESCE(NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''), u.email),
  COALESCE(u.phone, ''),
  u.email,
  true,
  m.created_at
FROM memberships m
JOIN users u ON u.id = m.user_id
WHERE m.registration_fee_paid = true AND m.starts_at IS NOT NULL
ORDER BY m.user_id, m.facility_id, m.created_at
ON CONFLICT (user_id, facility_id) DO NOTHING;
