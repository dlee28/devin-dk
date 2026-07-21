import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { listAuditLog } from "@/platform/audit";
import { listAccessLog } from "@/platform/accessLog";
import { getApp } from "@/platform/appRegistry";

// Admin-only log feed ('view_logs' permission), scoped to a single app via
// ?app=<key>. Reviewer attempts are denied with 403 and recorded in
// access_log by the platform wrapper.
export const GET = withGovernance(
  { permission: "view_logs", entityType: "logs" },
  async (req) => {
    const appKey = req.nextUrl.searchParams.get("app");
    const app = appKey ? getApp(appKey) : null;
    if (appKey && !app) {
      return NextResponse.json({ error: `Unknown app '${appKey}'` }, { status: 404 });
    }
    const type = req.nextUrl.searchParams.get("type") ?? "audit";
    const actor_id = req.nextUrl.searchParams.get("actor") ?? undefined;
    const entity_id = req.nextUrl.searchParams.get("entity") ?? undefined;
    const entries =
      type === "access"
        ? listAccessLog({
            actor_id,
            entity_id,
            endpoint_prefixes: app ? [app.apiPrefix, `/api/apps/${app.key}/`] : undefined,
          })
        : listAuditLog({
            actor_id,
            entity_id,
            app: app ? { entity_types: app.logEntityTypes, app_key: app.key } : undefined,
          });
    return NextResponse.json({ entries, app: app ? { key: app.key, name: app.name } : null });
  }
);
