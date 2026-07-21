/**
 * PLATFORM LAYER - registry of installed apps.
 * Drives the home-route launcher (/) and navigation.
 */
// Apps register here; the launcher and nav render from this registry. This
// mirrors Retool's model: the platform knows about apps, apps don't know
// about each other.
import type { Role } from "./roles";
import { getAllAppSettings } from "./appSettings";

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

/**
 * Role visibility is driven by each app's settings row (visible_to_roles),
 * editable from the app's settings page. Registry minRoleToSee is the
 * fallback for apps without a settings row.
 */
export function appsVisibleTo(role: Role): AppEntry[] {
  const settings = getAllAppSettings();
  return appRegistry.filter((app) => {
    const s = settings.get(app.key);
    if (s) return s.visible_to_roles.includes(role);
    return app.minRoleToSee === "reviewer" || role === "admin";
  });
}
