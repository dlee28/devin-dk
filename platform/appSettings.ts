/**
 * PLATFORM LAYER - per-application settings.
 * Each registered app has one app_settings row controlling:
 *   - visible_to_roles: which roles see the app in the launcher,
 *   - linked_database:  which registered data database the app reads/writes,
 *   - customizable:     which options individual users may set for themselves.
 * Admin edits go through /api/apps/[key]/settings (manage_app_settings);
 * user pref values live in user_app_prefs, scoped to the acting user.
 */
import { getDb } from "./config";
import type { Role } from "./roles";

export interface PrefDef {
  key: string;
  label: string;
  type: "select" | "boolean";
  options?: string[];
  default: string | boolean;
}

export interface AppSettings {
  app_key: string;
  visible_to_roles: Role[];
  linked_database: string;
  customizable: PrefDef[];
  updated_at: string;
  updated_by: string | null;
}

interface SettingsRow {
  app_key: string;
  visible_to_roles: string;
  linked_database: string;
  customizable: string;
  updated_at: string;
  updated_by: string | null;
}

function parse(row: SettingsRow): AppSettings {
  return {
    app_key: row.app_key,
    visible_to_roles: JSON.parse(row.visible_to_roles) as Role[],
    linked_database: row.linked_database,
    customizable: JSON.parse(row.customizable) as PrefDef[],
    updated_at: row.updated_at,
    updated_by: row.updated_by,
  };
}

export function getAppSettings(appKey: string): AppSettings | null {
  const row = getDb()
    .prepare("SELECT * FROM app_settings WHERE app_key = ?")
    .get(appKey) as SettingsRow | undefined;
  return row ? parse(row) : null;
}

export function getAllAppSettings(): Map<string, AppSettings> {
  const rows = getDb().prepare("SELECT * FROM app_settings").all() as SettingsRow[];
  return new Map(rows.map((r) => [r.app_key, parse(r)]));
}

export function updateAppSettings(
  appKey: string,
  changes: { visible_to_roles: Role[]; linked_database: string },
  actorId: string
): AppSettings {
  const updatedAt = new Date().toISOString();
  getDb()
    .prepare(
      "UPDATE app_settings SET visible_to_roles = ?, linked_database = ?, updated_at = ?, updated_by = ? WHERE app_key = ?"
    )
    .run(JSON.stringify(changes.visible_to_roles), changes.linked_database, updatedAt, actorId, appKey);
  return getAppSettings(appKey)!;
}

/** The acting user's pref values for an app, with defaults filled in. */
export function getUserPrefs(userId: string, appKey: string): Record<string, string | boolean> {
  const settings = getAppSettings(appKey);
  if (!settings) return {};
  const rows = getDb()
    .prepare("SELECT pref_key, value FROM user_app_prefs WHERE user_id = ? AND app_key = ?")
    .all(userId, appKey) as { pref_key: string; value: string }[];
  const saved = new Map(rows.map((r) => [r.pref_key, r.value]));
  const prefs: Record<string, string | boolean> = {};
  for (const def of settings.customizable) {
    const raw = saved.get(def.key);
    if (raw === undefined) prefs[def.key] = def.default;
    else prefs[def.key] = def.type === "boolean" ? raw === "true" : raw;
  }
  return prefs;
}

/**
 * Save a user's own pref values. Only keys declared in the app's customizable
 * definitions are accepted; select values must be one of the declared options.
 * Returns an error message on invalid input.
 */
export function setUserPrefs(
  userId: string,
  appKey: string,
  values: Record<string, unknown>
): string | null {
  const settings = getAppSettings(appKey);
  if (!settings) return "Unknown app";
  const defs = new Map(settings.customizable.map((d) => [d.key, d]));
  const updatedAt = new Date().toISOString();
  const upsert = getDb().prepare(
    `INSERT INTO user_app_prefs (user_id, app_key, pref_key, value, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, app_key, pref_key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  );
  for (const [key, value] of Object.entries(values)) {
    const def = defs.get(key);
    if (!def) return `'${key}' is not a customizable option for this app`;
    if (def.type === "boolean") {
      if (typeof value !== "boolean") return `'${key}' must be true or false`;
      upsert.run(userId, appKey, key, String(value), updatedAt);
    } else {
      if (typeof value !== "string" || !def.options?.includes(value))
        return `'${key}' must be one of: ${def.options?.join(", ")}`;
      upsert.run(userId, appKey, key, value, updatedAt);
    }
  }
  return null;
}
