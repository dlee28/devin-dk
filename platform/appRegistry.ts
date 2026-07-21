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
  /** Audit-log entity types owned by this app (for the per-app log view). */
  logEntityTypes: string[];
  /** API route prefix owned by this app (for access-log filtering). */
  apiPrefix: string;
}

export const appRegistry: AppEntry[] = [
  {
    key: "kyc",
    name: "KYC Review Queue",
    description: "Review, approve, and reject customer identity verification cases.",
    path: "/kyc",
    icon: "id-card",
    minRoleToSee: "reviewer",
    logEntityTypes: ["kyc_case"],
    apiPrefix: "/api/cases",
  },
  {
    key: "flags",
    name: "Feature Flags",
    description: "Toggle feature flags across staging and production environments.",
    path: "/flags",
    icon: "flag",
    minRoleToSee: "reviewer",
    logEntityTypes: ["feature_flag"],
    apiPrefix: "/api/flags",
  },
];

export function getApp(key: string): AppEntry | null {
  return appRegistry.find((a) => a.key === key) ?? null;
}

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
