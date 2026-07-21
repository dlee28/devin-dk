-- =============================================================================
-- Internal Tools Prototype - DATA schema
-- Applied to every linkable data database (db/data/<name>.sqlite), both the
-- seeded ones (development/staging/production) and databases linked later from
-- an app's settings page. Holds app domain data only; users, governance logs,
-- and settings stay in the platform database (db/schema.sql).
-- User references (assigned_to, decided_by, author_id) are plain ids resolved
-- against platform.users at query time - no cross-database foreign keys.
-- =============================================================================

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
  assigned_to    TEXT,
  created_at     TEXT NOT NULL,
  decided_at     TEXT,
  decided_by     TEXT
);

-- Free-form reviewer notes attached to a case.
CREATE TABLE IF NOT EXISTS case_notes (
  id         TEXT PRIMARY KEY,
  case_id    TEXT NOT NULL REFERENCES kyc_cases(id),
  author_id  TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
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
