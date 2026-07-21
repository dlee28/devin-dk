-- =============================================================================
-- Internal Tools Prototype - PLATFORM schema (db/platform.sqlite)
-- Users, governance logs, settings, and the database registry live here.
-- App domain data (cases, notes, flags) lives in the linked data databases
-- (db/data/<name>.sqlite, schema in db/data-schema.sql).
-- Applied by `npm run seed` (db/seed.ts).
-- =============================================================================

-- Seeded users. Role enforcement is real; authentication is stubbed (see
-- platform/currentUser.ts).
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('reviewer', 'admin'))
);

-- Registry of linkable data databases. Each row corresponds to a SQLite file
-- at db/data/<name>.sqlite holding app domain data (see db/data-schema.sql).
-- Managed from app settings pages: admins can link (create) and remove
-- databases; an app's app_settings.linked_database selects which one it
-- actually reads and writes.
CREATE TABLE IF NOT EXISTS databases (
  name       TEXT PRIMARY KEY CHECK (name GLOB '[a-z0-9-]*'),
  created_at TEXT NOT NULL,
  created_by TEXT REFERENCES users(id)
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
-- visible_to_roles drives launcher/registry visibility; linked_database names
-- the registered database the app reads and writes; customizable defines which options
-- individual users may set for themselves (see user_app_prefs).
CREATE TABLE IF NOT EXISTS app_settings (
  app_key          TEXT PRIMARY KEY,
  visible_to_roles TEXT NOT NULL,  -- JSON array of roles, e.g. ["reviewer","admin"]
  linked_database  TEXT NOT NULL REFERENCES databases(name),
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
