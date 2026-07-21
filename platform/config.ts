/**
 * PLATFORM LAYER - database connections.
 * Two kinds of SQLite databases:
 *   - the PLATFORM database (users, governance logs, settings, database
 *     registry) at db/platform.sqlite - getDb();
 *   - registered DATA databases (app domain data: cases, notes, flags) at
 *     db/data/<name>.sqlite - getDataDb(name). Each data connection has the
 *     platform database attached as `platform` so domain queries can join
 *     platform.users. Apps never construct their own connections or paths.
 * PROTOTYPE GAP: real environment separation means separate deployments,
 * databases, and credentials per environment - not files switched in-process.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? path.join(process.cwd(), "db", "platform.sqlite"),
  dataDir: process.env.DATA_DB_DIR ?? path.join(process.cwd(), "db", "data"),
};

export function dataDbPath(name: string): string {
  return path.join(config.dataDir, `${name}.sqlite`);
}

let db: Database.Database | null = null;

/** Platform database handle: users, logs, settings, database registry. */
export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.databaseUrl);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

const dataDbs = new Map<string, Database.Database>();

/**
 * Handle for a registered data database, with the platform database attached
 * as `platform`. Callers must validate the name against the registry first
 * (see platform/databases.ts).
 */
export function getDataDb(name: string): Database.Database {
  const cached = dataDbs.get(name);
  if (cached) return cached;
  const conn = new Database(dataDbPath(name));
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  conn.prepare("ATTACH DATABASE ? AS platform").run(config.databaseUrl);
  dataDbs.set(name, conn);
  return conn;
}

/** Close and forget a data connection (used when a database is removed). */
export function closeDataDb(name: string): void {
  const conn = dataDbs.get(name);
  if (conn) {
    conn.close();
    dataDbs.delete(name);
  }
}

/** Create the SQLite file for a new data database and apply the data schema. */
export function initDataDbFile(name: string): void {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const conn = new Database(dataDbPath(name));
  conn.pragma("journal_mode = WAL");
  conn.exec(fs.readFileSync(path.join(process.cwd(), "db", "data-schema.sql"), "utf8"));
  conn.close();
}
