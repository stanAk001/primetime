-- Login matched emails exactly, so "Akeem@…" (what a phone keyboard produces
-- by default) never found the row stored as "akeem@…" and came back as
-- "Invalid credentials". Lookups are normalised in the model now; this
-- settles the stored data and stops the duplicate-account case from ever
-- arising.
UPDATE users SET email = lower(trim(email)) WHERE email <> lower(trim(email));

-- One account per address, whatever case it was typed in. A plain UNIQUE on
-- email already exists but treats Akeem@x and akeem@x as two people.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
