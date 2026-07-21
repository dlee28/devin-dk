/**
 * PLATFORM LAYER - stubbed identity resolution.
 * No login. The top-nav "Viewing as:" switcher stores the selected user id in
 * a cookie; every server-side call resolves the actor from that cookie here.
 * This stub exists so ROLE ENFORCEMENT (real) is separated from
 * AUTHENTICATION (stubbed).
 *
 * PROTOTYPE GAP: replace with OIDC SSO (e.g., Okta) in production; est. 1-2
 * engineer-weeks incl. testing and offboarding flows.
 */
import { cookies } from "next/headers";
import { getDb } from "./config";
import type { User } from "./roles";

export const VIEWING_AS_COOKIE = "viewing_as";

export function listUsers(): User[] {
  return getDb().prepare("SELECT id, name, role FROM users ORDER BY name").all() as User[];
}

/** Resolve the current actor from the viewing-as cookie (server-side). */
export function getCurrentUser(): User {
  const id = cookies().get(VIEWING_AS_COOKIE)?.value;
  const db = getDb();
  if (id) {
    const user = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(id) as User | undefined;
    if (user) return user;
  }
  // Default actor before any switch: the seeded admin.
  return db.prepare("SELECT id, name, role FROM users ORDER BY role ASC, name LIMIT 1").get() as User;
}
