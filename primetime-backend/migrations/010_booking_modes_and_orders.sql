-- The booking model was one-size-fits-all: every facility was a "session"
-- priced per guest. That produced two wrong flows — a lounge you had to
-- reserve and pay for before drinking, and a hotel that took money without
-- you ever choosing a room. Each facility is now explicit about how it is
-- actually transacted, and the server enforces it.
--
--   session   — football: a pitch, for a slot, priced per guest
--   room      — hotel: pick a room, pay per night
--   membership— gym: plans, not sessions
--   walk_in   — lounge: walk in, order from the table, settle the bill
--   benefit   — table tennis: included with a membership
ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS booking_mode VARCHAR(20) NOT NULL DEFAULT 'session';

UPDATE facilities SET booking_mode = 'membership' WHERE slug = 'gym';
UPDATE facilities SET booking_mode = 'room'       WHERE slug = 'hotel';
UPDATE facilities SET booking_mode = 'walk_in'    WHERE slug = 'bar-lounge';
UPDATE facilities SET booking_mode = 'session'    WHERE slug = 'football-ground';
UPDATE facilities SET booking_mode = 'benefit'    WHERE slug = 'table-tennis';

-- A hotel booking is a room across nights, not a time window on one day.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id),
  ADD COLUMN IF NOT EXISTS check_out_date DATE;

CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(room_id, booking_date);

-- Time-of-day is meaningless for a room stay, so those columns have to stop
-- being mandatory before the first hotel booking can be written.
ALTER TABLE bookings ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN end_time DROP NOT NULL;

-- ——— Lounge orders ———
-- A tab, opened from the table's QR code. No account and no prepayment: the
-- bar makes it, the guest settles at the table like anywhere else.
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  table_label VARCHAR(40) NOT NULL,
  reference VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'placed',
  total_amount DECIMAL(10, 2) NOT NULL,
  note VARCHAR(280),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_orders_status ON orders(status, created_at DESC);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  -- Snapshot the name and price: the bar must be able to read back exactly
  -- what was ordered even after the menu is repriced.
  name_snapshot VARCHAR(160) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0 AND quantity <= 99),
  line_total DECIMAL(10, 2) NOT NULL
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
