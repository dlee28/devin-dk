/**
 * PLATFORM LAYER - environment-separated configuration.
 * Each environment gets its own database file; apps never construct their own
 * connections or paths.
 * PROTOTYPE GAP: real environment separation means separate deployments,
 * databases, and credentials per environment - not a config switch in one file.
 */
import Database from "better-sqlite3";
import path from "node:path";

type Env = "development" | "test" | "production";

const env = (process.env.APP_ENV as Env) ?? "development";

const DATABASE_URLS: Record<Env, string> = {
  development: process.env.DATABASE_URL ?? path.join(process.cwd(), "db", "dev.sqlite"),
  test: path.join(process.cwd(), "db", "test.sqlite"),
  production: path.join(process.cwd(), "db", "prod.sqlite"),
};

export const config = {
  env,
  databaseUrl: DATABASE_URLS[env],
};

let db: Database.Database | null = null;

/** Shared database handle. All platform and app data access goes through this. */
export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.databaseUrl);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}
