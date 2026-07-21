/**
 * Seed script: `npm run seed`
 * Recreates the platform database (db/platform.sqlite: users, logs, settings,
 * database registry) and three data databases (db/data/{development,staging,
 * production}.sqlite) with distinct fictional domain data, so relinking an app
 * to a different database visibly changes what it serves.
 * All names/emails are obviously fake (@example.com).
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config, dataDbPath } from "../platform/config";

const now = Date.now();
const daysAgo = (d: number, offsetMin = 0) =>
  new Date(now - d * 86400000 + offsetMin * 60000).toISOString();

// --- platform database ---------------------------------------------------------
const dbPath = config.databaseUrl;
for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(dbPath + suffix, { force: true });
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

// users: 3 reviewers + 1 admin
const users = [
  { id: "u-maria", name: "Maria Chen", role: "reviewer" },
  { id: "u-james", name: "James Okafor", role: "reviewer" },
  { id: "u-priya", name: "Priya Nair", role: "reviewer" },
  { id: "u-alex", name: "Alex Rivera", role: "admin" },
];
const insUser = db.prepare("INSERT INTO users (id, name, role) VALUES (?, ?, ?)");
for (const u of users) insUser.run(u.id, u.name, u.role);

// database registry: one row per data database file seeded below
const DATABASES = ["development", "staging", "production"] as const;
const insDb = db.prepare("INSERT INTO databases (name, created_at, created_by) VALUES (?, ?, ?)");
for (const name of DATABASES) insDb.run(name, daysAgo(30), "u-alex");

// --- data databases -------------------------------------------------------------
fs.mkdirSync(config.dataDir, { recursive: true });
const dataSchema = fs.readFileSync(path.join(__dirname, "data-schema.sql"), "utf8");

function openDataDb(name: string): Database.Database {
  const p = dataDbPath(name);
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(p + suffix, { force: true });
  const conn = new Database(p);
  conn.pragma("journal_mode = WAL");
  conn.exec(dataSchema);
  return conn;
}

type SeedCase = {
  id: string;
  customer_name: string;
  customer_email: string;
  date_of_birth: string;
  country: string;
  document_type: "passport" | "drivers_license" | "national_id";
  risk_score: number;
  status: "pending" | "in_review" | "approved" | "rejected";
  assigned_to: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

const countries = ["US", "GB", "DE", "NG", "IN", "BR", "CA", "SG", "FR", "MX"];
const docs: SeedCase["document_type"][] = ["passport", "drivers_license", "national_id"];

function makeCases(prefix: string, names: string[], riskScores: number[]): SeedCase[] {
  return names.map((n, i) => ({
    id: `${prefix}-${String(i + 1).padStart(3, "0")}`,
    customer_name: n,
    customer_email: `${n.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
    date_of_birth: `19${60 + (i % 35)}-0${(i % 9) + 1}-${String((i % 27) + 1).padStart(2, "0")}`,
    country: countries[i % countries.length],
    document_type: docs[i % docs.length],
    risk_score: riskScores[i],
    status: "pending",
    assigned_to: null,
    created_at: daysAgo(30 - i, i * 13),
    decided_at: null,
    decided_by: null,
  }));
}

const CASE_SQL = `INSERT INTO kyc_cases
  (id, customer_name, customer_email, date_of_birth, country, document_type, risk_score, status, assigned_to, created_at, decided_at, decided_by)
  VALUES (@id, @customer_name, @customer_email, @date_of_birth, @country, @document_type, @risk_score, @status, @assigned_to, @created_at, @decided_at, @decided_by)`;
const NOTE_SQL =
  "INSERT INTO case_notes (id, case_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)";
const FLAG_SQL =
  "INSERT INTO feature_flags (id, key, description, enabled, environment, updated_at) VALUES (?, ?, ?, ?, ?, ?)";

// ---- development: the full demo dataset -----------------------------------------
const devNames = [
  "Ana Testworth", "Bob Sampleton", "Carla Mockman", "Dev Fakerly",
  "Elena Placeholder", "Farid Dummydata", "Grace Notreal", "Hugo Fictus",
  "Iris Pretendo", "Jonas Faux", "Kim Imaginary", "Lars Madeupsen",
  "Mona Specimen", "Nils Example", "Olga Fabricant", "Pete Prototype",
  "Quinn Simulant", "Rosa Ersatz", "Sami Mockberg", "Tara Phantomly",
  "Ulf Stagecraft", "Vera Synthetica", "Wes Bogusman", "Xena Illustrata",
  "Yuri Demonstrant",
];
const devRisk = [12, 85, 34, 71, 22, 90, 45, 8, 76, 51, 29, 67, 95, 18, 40, 73, 55, 31, 88, 26, 62, 14, 79, 48, 37];
const devCases = makeCases("case", devNames, devRisk);

// 5 in_review, assigned across reviewers
const reviewers = ["u-maria", "u-james", "u-priya"];
for (let i = 12; i < 17; i++) {
  devCases[i].status = "in_review";
  devCases[i].assigned_to = reviewers[i % 3];
}
// 5 approved, 3 rejected (decided). Remaining 12 stay pending.
const decisions: { idx: number; status: "approved" | "rejected"; by: string; rationale: string }[] = [
  { idx: 17, status: "approved", by: "u-maria", rationale: "Passport verified against issuing-country format; low risk score; address matches utility bill." },
  { idx: 18, status: "approved", by: "u-james", rationale: "Documents legible and consistent; watchlist screening returned no hits." },
  { idx: 19, status: "approved", by: "u-priya", rationale: "National ID checksum valid; selfie match passed; risk score well below threshold." },
  { idx: 20, status: "approved", by: "u-maria", rationale: "Repeat customer with consistent history; documents re-verified without discrepancies." },
  { idx: 21, status: "approved", by: "u-alex", rationale: "Escalated review complete: source-of-funds documentation satisfactory despite elevated risk score." },
  { idx: 22, status: "rejected", by: "u-james", rationale: "Document photo shows signs of tampering around the date-of-birth field; failed secondary check." },
  { idx: 23, status: "rejected", by: "u-priya", rationale: "Risk score 48 but name matched sanctions watchlist entry; rejecting pending enhanced due diligence." },
  { idx: 24, status: "rejected", by: "u-maria", rationale: "Submitted driver's license expired more than 12 months ago; customer failed to provide a valid replacement." },
];
for (const d of decisions) {
  const c = devCases[d.idx];
  c.status = d.status;
  c.assigned_to = d.by === "u-alex" ? null : d.by;
  c.decided_at = daysAgo(5 - (d.idx % 5), d.idx * 7);
  c.decided_by = d.by;
}

const devDb = openDataDb("development");
const insDevCase = devDb.prepare(CASE_SQL);
for (const c of devCases) insDevCase.run(c);

const insDevNote = devDb.prepare(NOTE_SQL);
insDevNote.run("note-1", "case-013", "u-maria", "Waiting on customer to re-upload a clearer passport photo page.", daysAgo(4));
insDevNote.run("note-2", "case-014", "u-james", "Address on file differs from document; requested proof of address.", daysAgo(3));
insDevNote.run("note-3", "case-023", "u-james", "Tampering suspicion confirmed by second reviewer before rejection.", daysAgo(2));
insDevNote.run("note-4", "case-016", "u-priya", "High risk score driven by geography; no adverse media found so far.", daysAgo(1));

const insDevFlag = devDb.prepare(FLAG_SQL);
insDevFlag.run("flag-1", "new-onboarding-flow", "Redesigned customer onboarding wizard", 1, "staging", daysAgo(10));
insDevFlag.run("flag-2", "new-onboarding-flow-prod", "Redesigned customer onboarding wizard (production rollout)", 0, "production", daysAgo(9));
insDevFlag.run("flag-3", "risk-model-v2", "Second-generation risk scoring model", 1, "staging", daysAgo(4));
insDevFlag.run("flag-4", "instant-payouts", "Instant payout rail for verified customers", 0, "production", daysAgo(2));
devDb.close();

// ---- staging: smaller, distinct dataset ------------------------------------------
const stgNames = [
  "Stella Stageberg", "Stanley Mockwell", "Sasha Trialova", "Sergio Betaman",
  "Selma Previewson", "Stefan Draftner", "Suki Sandboxa", "Sven Candidato",
];
const stgRisk = [82, 15, 47, 91, 33, 68, 24, 77];
const stgCases = makeCases("stg-case", stgNames, stgRisk);
stgCases[0].status = "in_review";
stgCases[0].assigned_to = "u-maria";
stgCases[1].status = "in_review";
stgCases[1].assigned_to = "u-james";

const stgDb = openDataDb("staging");
const insStgCase = stgDb.prepare(CASE_SQL);
for (const c of stgCases) insStgCase.run(c);
stgDb.prepare(NOTE_SQL).run("stg-note-1", "stg-case-001", "u-maria", "Staging dataset: verifying new risk-model output against this case.", daysAgo(2));
const insStgFlag = stgDb.prepare(FLAG_SQL);
insStgFlag.run("stg-flag-1", "risk-model-v3-canary", "Canary rollout of third-generation risk model", 1, "staging", daysAgo(3));
insStgFlag.run("stg-flag-2", "bulk-case-actions", "Bulk approve/reject actions in the review queue", 0, "staging", daysAgo(1));
stgDb.close();

// ---- production: smallest, distinct dataset --------------------------------------
const prodNames = [
  "Paula Livedata", "Pierre Realcase", "Priti Launchwell", "Pablo Shipley", "Ping Golivera",
];
const prodRisk = [28, 64, 9, 87, 42];
const prodCases = makeCases("prod-case", prodNames, prodRisk);
prodCases[3].status = "in_review";
prodCases[3].assigned_to = "u-priya";

const prodDb = openDataDb("production");
const insProdCase = prodDb.prepare(CASE_SQL);
for (const c of prodCases) insProdCase.run(c);
const insProdFlag = prodDb.prepare(FLAG_SQL);
insProdFlag.run("prod-flag-1", "instant-payouts", "Instant payout rail for verified customers", 1, "production", daysAgo(6));
insProdFlag.run("prod-flag-2", "new-onboarding-flow-prod", "Redesigned customer onboarding wizard (production rollout)", 0, "production", daysAgo(5));
prodDb.close();

// --- coherent audit_log + access_log entries for decided dev cases -----------------
const insAudit = db.prepare(`INSERT INTO audit_log
  (actor_id, action, entity_type, entity_id, before_state, after_state, rationale, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
const insAccess = db.prepare(`INSERT INTO access_log
  (actor_id, actor_role, method, endpoint, entity_type, entity_id, timestamp, outcome)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

const roleOf = (id: string) => users.find((u) => u.id === id)!.role;

for (const d of decisions) {
  const c = devCases[d.idx];
  const before = { status: "in_review", decided_at: null, decided_by: null };
  const after = { status: c.status, decided_at: c.decided_at, decided_by: c.decided_by };
  // the reviewer viewed the case, then submitted the decision
  insAccess.run(d.by, roleOf(d.by), "GET", `/api/cases/${c.id}`, "kyc_case", c.id, daysAgo(5 - (d.idx % 5), d.idx * 7 - 9), "allowed");
  insAccess.run(d.by, roleOf(d.by), "POST", `/api/cases/${c.id}/decision`, "kyc_case", c.id, c.decided_at!, "allowed");
  insAudit.run(d.by, c.status === "approved" ? "case.approve" : "case.reject", "kyc_case", c.id, JSON.stringify(before), JSON.stringify(after), d.rationale, c.decided_at!);
}
// reassignment history for the in_review cases (admin moved them into review)
for (let i = 12; i < 17; i++) {
  const c = devCases[i];
  const ts = daysAgo(7, i * 11);
  insAudit.run("u-alex", "case.reassign", "kyc_case", c.id,
    JSON.stringify({ status: "pending", assigned_to: null }),
    JSON.stringify({ status: "in_review", assigned_to: c.assigned_to }),
    "Weekly queue triage: balancing workload across reviewers.", ts);
  insAccess.run("u-alex", "admin", "POST", `/api/cases/${c.id}/reassign`, "kyc_case", c.id, ts, "allowed");
}
// one denied attempt so the denied filter is non-empty on first run
insAccess.run("u-james", "reviewer", "POST", "/api/cases/case-015/reassign", "kyc_case", "case-015", daysAgo(6), "denied");

// --- per-app settings ----------------------------------------------------------
const insSettings = db.prepare(
  "INSERT INTO app_settings (app_key, visible_to_roles, linked_database, customizable, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?)"
);
insSettings.run(
  "kyc",
  JSON.stringify(["reviewer", "admin"]),
  "development",
  JSON.stringify([
    { key: "default_status_tab", label: "Default queue tab", type: "select", options: ["all", "pending", "in_review", "approved", "rejected"], default: "all" },
    { key: "show_risk_warnings", label: "Highlight high-risk cases (\u2265 70)", type: "boolean", default: true },
  ]),
  daysAgo(14),
  "u-alex"
);
insSettings.run(
  "flags",
  JSON.stringify(["reviewer", "admin"]),
  "development",
  JSON.stringify([
    { key: "compact_rows", label: "Compact table rows", type: "boolean", default: false },
  ]),
  daysAgo(14),
  "u-alex"
);
db.close();
console.log(
  `Seeded ${dbPath}: ${users.length} users, ${DATABASES.length} databases, 2 app settings.\n` +
    `Data: development (${devCases.length} cases, 4 flags), staging (${stgCases.length} cases, 2 flags), production (${prodCases.length} cases, 2 flags).`
);
