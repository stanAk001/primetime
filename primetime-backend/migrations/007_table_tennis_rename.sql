-- The benefit facility is table tennis (bats, indoor tables), not lawn
-- tennis on a court. 006 seeded it as "Tennis Court" / 'tennis'; this
-- corrects the name, slug and copy so the whole facility reads honestly.
-- is_bookable stays false — it's still complimentary for gym members.
UPDATE facilities
SET
  name = 'Table Tennis',
  slug = 'table-tennis',
  description = 'Complimentary for active gym members',
  long_description = 'Two tournament tables just off the gym floor, free to play for anyone on an active membership. No table fee, no reservation — pick up bats and a ball at the front desk, show your digital card, and play. Best of three while your legs recover.',
  capacity = 8,
  amenities = '["Free for Gym Members", "Two Tournament Tables", "Bats & Balls Provided", "No Booking Needed", "Changing Rooms"]'::jsonb,
  updated_at = CURRENT_TIMESTAMP
WHERE slug = 'tennis';
