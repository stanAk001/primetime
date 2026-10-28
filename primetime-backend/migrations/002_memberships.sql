-- Gym membership plans + digital access cards.
-- The gym is subscription-based in reality (registration fee + a plan,
-- checked by scanning a QR card), not session-booked like the other
-- three facilities — this is a parallel system, not a replacement for
-- the bookings table, which the hotel/bar-lounge/football-ground keep.

CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  duration_days INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  requires_registration_fee BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_membership_plans_facility_id ON membership_plans(facility_id);

CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  qr_code VARCHAR(64) UNIQUE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  starts_at DATE,
  expires_at DATE,
  status VARCHAR(50) DEFAULT 'pending', -- pending | active | cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_qr_code ON memberships(qr_code);
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_memberships_facility_active ON memberships(facility_id, status, expires_at);

-- Payments can now fund either a session booking or a membership period —
-- exactly one of the two, never both, never neither.
ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT payments_exactly_one_target CHECK (
  (booking_id IS NOT NULL)::int + (membership_id IS NOT NULL)::int = 1
);
CREATE INDEX idx_payments_membership_id ON payments(membership_id);

-- Seed plans for the Gym. ₦3,000/day and ₦25,000/month are the two
-- confirmed prices; weekly/2-week/3-week are placeholders pending the
-- owner's numbers — edit freely from the admin Membership Plans tab.
-- Only the monthly plan carries the one-time ₦5,000 registration fee.
INSERT INTO membership_plans (facility_id, name, duration_days, price, requires_registration_fee, display_order)
SELECT id, 'Day Pass', 1, 3000.00, false, 1 FROM facilities WHERE slug = 'gym'
UNION ALL
SELECT id, 'Weekly', 7, 18000.00, false, 2 FROM facilities WHERE slug = 'gym'
UNION ALL
SELECT id, '2 Weeks', 14, 33000.00, false, 3 FROM facilities WHERE slug = 'gym'
UNION ALL
SELECT id, '3 Weeks', 21, 46000.00, false, 4 FROM facilities WHERE slug = 'gym'
UNION ALL
SELECT id, 'Monthly', 30, 25000.00, true, 5 FROM facilities WHERE slug = 'gym';
