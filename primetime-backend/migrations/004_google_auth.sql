-- Sign in with Google. A Google-only account never sets a password, so
-- password_hash can no longer be required; google_id is Google's stable
-- per-user identifier, used to find an account on return visits and to
-- link a Google sign-in to an existing password account with the same
-- (Google-verified) email.

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
CREATE INDEX idx_users_google_id ON users(google_id);
