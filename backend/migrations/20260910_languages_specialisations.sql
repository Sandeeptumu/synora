-- 20260910 Languages, primary language, and specialisations for users
-- Keeps existing records intact; new columns are nullable with no forced defaults.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS language_codes VARCHAR(256),
  ADD COLUMN IF NOT EXISTS primary_language VARCHAR(8),
  ADD COLUMN IF NOT EXISTS specialisations_json TEXT;

-- Support workflow tables (idempotent creates where supported; adjust for your DB if needed)

CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  mood VARCHAR(32),
  stress_level INTEGER,
  energy_level INTEGER,
  sleep_quality INTEGER,
  connection_level INTEGER,
  note_text VARCHAR(2000),
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  kind VARCHAR(32) NOT NULL,
  message_text VARCHAR(4000),
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS support_triage (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  primary_concern VARCHAR(128),
  concern_areas_json TEXT,
  risk_level VARCHAR(16),
  suggested_support VARCHAR(256),
  match_summary_json TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);
