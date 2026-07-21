/**
 * PLATFORM LAYER - Layer 2: runtime access log.
 * This replicates Retool's resource-layer logging: every API request (reads
 * and writes, allowed and denied) is recorded automatically by withGovernance.
 * Zero per-app code - an app gets access logging by existing.
 *
 * This module exposes ONLY insert and read functions. No update or delete
 * functions exist anywhere in the codebase; SQLite triggers additionally
 * block UPDATE/DELETE on the table (see db/schema.sql).
 * PROTOTYPE GAP: production immutability requires WORM storage /
 * write-restricted DB role / SIEM export, not app-side discipline.
 */
import { getDb } from "./config";

export interface AccessLogEntry {
  id: number;
  actor_id: string;
  actor_role: string;
  method: string;
  endpoint: string;
  entity_type: string;
  entity_id: string | null;
  timestamp: string;
  outcome: "allowed" | "denied";
}

export function logAccess(entry: Omit<AccessLogEntry, "id" | "timestamp">): void {
  getDb()
    .prepare(
      `INSERT INTO access_log (actor_id, actor_role, method, endpoint, entity_type, entity_id, timestamp, outcome)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      entry.actor_id,
      entry.actor_role,
      entry.method,
      entry.endpoint,
      entry.entity_type,
      entry.entity_id,
      new Date().toISOString(),
      entry.outcome
    );
}

export function listAccessLog(
  filters: { actor_id?: string; entity_id?: string; endpoint_prefixes?: string[] } = {}
): AccessLogEntry[] {
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
  if (filters.endpoint_prefixes && filters.endpoint_prefixes.length > 0) {
    where.push(`(${filters.endpoint_prefixes.map(() => "endpoint LIKE ?").join(" OR ")})`);
    params.push(...filters.endpoint_prefixes.map((p) => `${p}%`));
  }
  const sql = `SELECT * FROM access_log ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id DESC LIMIT 200`;
  return getDb().prepare(sql).all(...params) as AccessLogEntry[];
}
