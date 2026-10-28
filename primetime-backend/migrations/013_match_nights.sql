-- Match night: the product only a complex like this one can sell.
--
-- A bar alone can show a game; a pitch alone can sell a slot. Having both
-- means an evening — five-a-side, then the real match on the screen, food in
-- between — which is a four-hour visit across three facilities instead of a
-- one-hour booking.
--
-- Note the deliberate exception to the lounge's walk-in rule: on a derby the
-- room fills, and a table has to be held. It is still NOT prepaid — the
-- reservation holds a table, the bill is settled there like any other night.

CREATE TABLE fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition VARCHAR(120) NOT NULL,
  home_team VARCHAR(80) NOT NULL,
  away_team VARCHAR(80) NOT NULL,
  kickoff_at TIMESTAMP NOT NULL,
  -- The one screened on the big wall rather than a side screen.
  is_featured BOOLEAN NOT NULL DEFAULT false,
  -- Optional five-a-side slot on our own pitch before kickoff: the thing
  -- that turns a viewing into an evening.
  undercard_at TIMESTAMP,
  media_key VARCHAR(80),
  note VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fixtures_kickoff ON fixtures(kickoff_at) WHERE is_active;

CREATE TABLE match_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  tagline VARCHAR(255),
  price DECIMAL(10, 2) NOT NULL,
  serves INT NOT NULL,
  includes JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT
);

CREATE TABLE fixture_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  package_id UUID REFERENCES match_packages(id),
  guest_name VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  party_size INT NOT NULL CHECK (party_size > 0 AND party_size <= 40),
  reference VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'reserved',
  note VARCHAR(280),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fixture_reservations ON fixture_reservations(fixture_id, status);
