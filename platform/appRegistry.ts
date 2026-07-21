/**
 * PLATFORM LAYER - registry of installed apps.
 * Drives the home-route launcher (/) and navigation.
 */
// Apps register here; the launcher and nav render from this registry. This
// mirrors Retool's model: the platform knows about apps, apps don't know
// about each other.
import type { Role } from "./roles";

export interface AppEntry {
  key: string;
  name: string;
  description: string;
  path: string;
  icon: string;
  minRoleToSee: Role;
}

export const appRegistry: AppEntry[] = [
  {
    key: "kyc",
    name: "KYC Review Queue",
    description: "Review, approve, and reject customer identity verification cases.",
    path: "/kyc",
    icon: "🪪",
    minRoleToSee: "reviewer",
  },
  {
    key: "flags",
    name: "Feature Flags",
    description: "Toggle feature flags across staging and production environments.",
    path: "/flags",
    icon: "🚩",
    minRoleToSee: "reviewer",
  },
  {
    key: "admin-logs",
    name: "Audit & Access Logs",
    description: "Inspect the domain audit trail and the runtime access log.",
    path: "/admin/logs",
    icon: "📜",
    minRoleToSee: "admin",
  },
];

/** Role visibility: 'reviewer' entries are visible to everyone; 'admin' entries to admins only. */
export function appsVisibleTo(role: Role): AppEntry[] {
  return appRegistry.filter((app) => app.minRoleToSee === "reviewer" || role === "admin");
}
