/**
 * PLATFORM LAYER - role definitions as data.
 * Permissions live in this single map, not in scattered conditionals.
 * Route handlers never check roles; they declare a required permission and
 * withGovernance enforces it.
 */

export type Role = "reviewer" | "admin";

export type Permission =
  | "view_cases"            // view queue + case detail
  | "decide_case"           // approve / reject a case
  | "decide_others_case"    // decide a case assigned to someone else
  | "reassign_case"         // reassign a case
  | "override_decision"     // override a finalized decision
  | "view_logs"             // view audit + access logs in UI
  | "toggle_staging_flag"   // flags app: toggle staging flags
  | "toggle_production_flag"; // flags app: toggle production flags

export interface User {
  id: string;
  name: string;
  role: Role;
}

const PERMISSIONS: Record<Role, Permission[]> = {
  reviewer: ["view_cases", "decide_case", "toggle_staging_flag"],
  admin: [
    "view_cases",
    "decide_case",
    "decide_others_case",
    "reassign_case",
    "override_decision",
    "view_logs",
    "toggle_staging_flag",
    "toggle_production_flag",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}
