/**
 * PLATFORM LAYER - Layer 3: domain audit trail.
 * Records business decisions (approve/reject/reassign/override/toggle) with
 * before/after state and rationale. Called explicitly by workflows on state
 * changes - this is the "traceable justification for every decision" layer.
 *
 * Append-only: this module exposes ONLY insert and read functions. No update
 * or delete functions exist anywhere in the codebase; SQLite triggers
 * additionally block UPDATE/DELETE on the table (see db/schema.sql).
 * PROTOTYPE GAP: production immutability requires WORM storage /
 * write-restricted DB role / SIEM export, not app-side discipline.
 */
import { getDb } from "./config";

export interface AuditLogEntry {
  id: number;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state: string; // JSON
  after_state: string; // JSON
  rationale: string | null;
  timestamp: string;
}

export function writeAudit(entry: {
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state: unknown;
  after_state: unknown;
  rationale?: string | null;
}): void {
  getDb()
    .prepare(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, before_state, after_state, rationale, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      entry.actor_id,
      entry.action,
      entry.entity_type,
      entry.entity_id,
      JSON.stringify(entry.before_state),
      JSON.stringify(entry.after_state),
      entry.rationale ?? null,
      new Date().toISOString()
    );
}

export function listAuditLog(filters: { actor_id?: string; entity_id?: string } = {}): AuditLogEntry[] {
  const where: string[] = [];
  const params: string[] = [];
  if (filters.actor_id) {
    where.push("actor_id = ?");
    params.push(filters.actor_id);
  }
  if (filters.entity_id) {
    where.push("entity_id = ?");
    params.push(filters.entity_id);
  }
  const sql = `SELECT * FROM audit_log ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id DESC LIMIT 200`;
  return getDb().prepare(sql).all(...params) as AuditLogEntry[];
}

export function auditHistoryForEntity(entity_type: string, entity_id: string): AuditLogEntry[] {
  return getDb()
    .prepare("SELECT * FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY id DESC LIMIT 200")
    .all(entity_type, entity_id) as AuditLogEntry[];
}
