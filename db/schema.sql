-- =============================================================================
-- Internal Tools Prototype - full schema
-- SQLite (better-sqlite3). Applied by `npm run seed` (db/seed.ts).
-- =============================================================================

-- Seeded users. Role enforcement is real; authentication is stubbed (see
-- platform/currentUser.ts).
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('reviewer', 'admin'))
);

-- KYC cases under review. Fictional data only.
CREATE TABLE IF NOT EXISTS kyc_cases (
  id             TEXT PRIMARY KEY,
  customer_name  TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  date_of_birth  TEXT NOT NULL,
  country        TEXT NOT NULL,
  document_type  TEXT NOT NULL CHECK (document_type IN ('passport', 'drivers_license', 'national_id')),
  risk_score     INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  status         TEXT NOT NULL CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
  assigned_to    TEXT REFERENCES users(id),
  created_at     TEXT NOT NULL,
  decided_at     TEXT,
  decided_by     TEXT REFERENCES users(id)
);

-- Free-form reviewer notes attached to a case.
CREATE TABLE IF NOT EXISTS case_notes (
  id         TEXT PRIMARY KEY,
  case_id    TEXT NOT NULL REFERENCES kyc_cases(id),
  author_id  TEXT NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Layer 2 - Runtime access log (replicates Retool's resource-layer logging).
-- Written automatically by platform/withGovernance.ts on EVERY api request,
-- reads and writes, allowed or denied. Apps contain zero logging code.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    TEXT NOT NULL,
  actor_role  TEXT NOT NULL,
  method      TEXT NOT NULL,
  endpoint    TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  timestamp   TEXT NOT NULL,
  outcome     TEXT NOT NULL CHECK (outcome IN ('allowed', 'denied'))
);

-- ---------------------------------------------------------------------------
-- Layer 3 - Domain audit trail (business decisions). Written explicitly by
-- workflows via platform/audit.ts on state changes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id     TEXT NOT NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  before_state TEXT NOT NULL, -- JSON snapshot
  after_state  TEXT NOT NULL, -- JSON snapshot
  rationale    TEXT,
  timestamp    TEXT NOT NULL
);

-- Per-application settings, managed from each app's settings page.
-- visible_to_roles drives launcher/registry visibility; linked_database is the
-- data source label the app reads from; customizable defines which options
-- individual users may set for themselves (see user_app_prefs).
CREATE TABLE IF NOT EXISTS app_settings (
  app_key          TEXT PRIMARY KEY,
  visible_to_roles TEXT NOT NULL,  -- JSON array of roles, e.g. ["reviewer","admin"]
  linked_database  TEXT NOT NULL CHECK (linked_database IN ('development', 'staging', 'production')),
  customizable     TEXT NOT NULL,  -- JSON array of user-customizable pref definitions
  updated_at       TEXT NOT NULL,
  updated_by       TEXT REFERENCES users(id)
);

-- Per-user values for the customizable options an app's settings expose.
CREATE TABLE IF NOT EXISTS user_app_prefs (
  user_id    TEXT NOT NULL REFERENCES users(id),
  app_key    TEXT NOT NULL REFERENCES app_settings(app_key),
  pref_key   TEXT NOT NULL,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, app_key, pref_key)
);

-- Feature flags (stretch app /apps/flags - second thin app on the platform).
CREATE TABLE IF NOT EXISTS feature_flags (
  id          TEXT PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 0,
  environment TEXT NOT NULL CHECK (environment IN ('staging', 'production')),
  updated_at  TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Append-only enforcement for both log tables (prototype-grade): the platform
-- modules expose only insert functions, and these triggers block UPDATE/DELETE
-- at the database level.
-- PROTOTYPE GAP: production immutability requires WORM storage /
-- write-restricted DB role / SIEM export, not app-side discipline.
-- ---------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS access_log_no_update
BEFORE UPDATE ON access_log
BEGIN
  SELECT RAISE(ABORT, 'access_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS access_log_no_delete
BEFORE DELETE ON access_log
BEGIN
  SELECT RAISE(ABORT, 'access_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS audit_log_no_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS audit_log_no_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;
