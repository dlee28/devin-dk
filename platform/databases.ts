/**
 * PLATFORM LAYER - database registry.
 * Registered databases are real SQLite files (db/data/<name>.sqlite) holding
 * app domain data. Admins link (create) and remove them from an app's settings
 * page; an app's app_settings.linked_database selects which one the app
 * actually reads and writes (see getAppDb). Every change is audited.
 */
import fs from "node:fs";
import type Database from "better-sqlite3";
import { closeDataDb, dataDbPath, getDataDb, getDb, initDataDbFile } from "./config";
import { getAppSettings, getAllAppSettings } from "./appSettings";
import { writeAudit } from "./audit";

export interface DatabaseEntry {
  name: string;
  created_at: string;
  created_by: string | null;
}

const NAME_RE = /^[a-z0-9][a-z0-9-]{1,29}$/;

export function listDatabases(): DatabaseEntry[] {
  return getDb()
    .prepare("SELECT name, created_at, created_by FROM databases ORDER BY created_at, name")
    .all() as DatabaseEntry[];
}

export function databaseExists(name: string): boolean {
  return (
    getDb().prepare("SELECT 1 FROM databases WHERE name = ?").get(name) !== undefined
  );
}

/**
 * Link (register) a new database: creates the SQLite file with the data
 * schema and records it in the registry. Returns an error message on invalid
 * input, null on success.
 */
export function createDatabase(name: string, actorId: string): string | null {
  if (!NAME_RE.test(name)) {
    return "Database name must be 2-30 characters of lowercase letters, digits, and hyphens";
  }
  if (databaseExists(name)) return `A database named '${name}' is already linked`;

  initDataDbFile(name);
  getDb()
    .prepare("INSERT INTO databases (name, created_at, created_by) VALUES (?, ?, ?)")
    .run(name, new Date().toISOString(), actorId);

  writeAudit({
    actor_id: actorId,
    action: "database.link",
    entity_type: "database",
    entity_id: name,
    before_state: {},
    after_state: { name },
  });
  return null;
}

/**
 * Remove a registered database and delete its file. Refused while any app is
 * still linked to it. Returns an error message on failure, null on success.
 */
export function removeDatabase(name: string, actorId: string): string | null {
  if (!databaseExists(name)) return `No linked database named '${name}'`;

  const linkedBy = Array.from(getAllAppSettings().values())
    .filter((s) => s.linked_database === name)
    .map((s) => s.app_key);
  if (linkedBy.length > 0) {
    return `Cannot remove '${name}': still linked by ${linkedBy.join(", ")}. Relink those apps first.`;
  }

  closeDataDb(name);
  getDb().prepare("DELETE FROM databases WHERE name = ?").run(name);
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(dataDbPath(name) + suffix, { force: true });
  }

  writeAudit({
    actor_id: actorId,
    action: "database.remove",
    entity_type: "database",
    entity_id: name,
    before_state: { name },
    after_state: {},
  });
  return null;
}

/**
 * The data database an app is currently linked to. This is how switching
 * "Linked database" in settings actually changes the data an app serves.
 */
export function getAppDb(appKey: string): Database.Database {
  const settings = getAppSettings(appKey);
  if (!settings) throw new Error(`No settings for app '${appKey}'`);
  if (!databaseExists(settings.linked_database)) {
    throw new Error(`Linked database '${settings.linked_database}' is not registered`);
  }
  return getDataDb(settings.linked_database);
}
