-- Tennis is a gym-member benefit rather than a session you reserve: members
-- walk on when they want a break from the floor, at no extra cost. That rule
-- lives in the column, not just the UI — is_bookable lets Booking.create
-- reject a session attempt server-side even if someone posts straight to the
-- API, the same way membership-based facilities are already rejected.
ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS is_bookable BOOLEAN NOT NULL DEFAULT true;

INSERT INTO facilities
  (name, slug, category, description, long_description, capacity,
   price_per_session, amenities, opening_time, closing_time,
   is_active, is_bookable, display_order)
VALUES
  ('Tennis Court', 'tennis', 'sports',
   'Complimentary for active gym members',
   'Two floodlit hardcourts beside the gym, free to play for anyone on an active membership. No court fee, no reservation — pick up a racket and balls at the front desk, show your digital card, and play.',
   4, 0.00,
   '["Free for Gym Members", "Floodlit Courts", "Rackets & Balls Provided", "No Booking Needed", "Changing Rooms"]'::jsonb,
   '06:00:00', '22:00:00', true, false, 5)
ON CONFLICT (slug) DO NOTHING;
