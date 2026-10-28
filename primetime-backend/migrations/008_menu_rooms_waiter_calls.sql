-- Three things the lounge and hotel pages were missing:
--   1. a real drinks/grill menu for the lounge, structured so it can be
--      served from a QR code at the table rather than a printed card;
--   2. room types for the hotel, since "the hotel" is not one product;
--   3. waiter calls — the button a walk-in presses after scanning the QR,
--      which has to land somewhere staff actually watch (the admin page).

CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  tagline VARCHAR(255),
  -- Key into the frontend media map (lib/menuMedia.js), so artwork can be
  -- swapped for Primetime's own footage without a migration.
  media_key VARCHAR(80),
  display_order INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (facility_id, slug)
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  -- "60cl bottle", "per plate", "calabash" — what the price actually buys.
  serving VARCHAR(80),
  media_key VARCHAR(80),
  tags JSONB DEFAULT '[]',
  is_available BOOLEAN NOT NULL DEFAULT true,
  display_order INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  tier VARCHAR(40) NOT NULL,
  description TEXT,
  price_per_night DECIMAL(10, 2) NOT NULL,
  capacity INT,
  bed VARCHAR(80),
  size_sqm INT,
  amenities JSONB DEFAULT '[]',
  media_key VARCHAR(80),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (facility_id, slug)
);
CREATE INDEX idx_rooms_facility ON rooms(facility_id);

-- A walk-in scans the QR at their table and taps "Call a waiter". No account,
-- no booking — just a table label and an optional note. Staff clear it from
-- the admin dashboard.
CREATE TABLE waiter_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  table_label VARCHAR(40) NOT NULL,
  note VARCHAR(280),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP
);
CREATE INDEX idx_waiter_calls_status ON waiter_calls(status, created_at DESC);
