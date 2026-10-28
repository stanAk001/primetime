-- Offline ordering means retries, and a retry must never become a second
-- round of drinks. The client mints a reference before it ever reaches the
-- network and reuses it for every attempt, so the server can recognise a
-- repeat and hand back the order it already created.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS client_ref VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_ref
  ON orders (client_ref) WHERE client_ref IS NOT NULL;
