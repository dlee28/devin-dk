import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { listAuditLog } from "@/platform/audit";
import { listAccessLog } from "@/platform/accessLog";

// Admin-only log viewer feed ('view_logs' permission). Reviewer attempts are
// denied with 403 and recorded in access_log by the platform wrapper.
export const GET = withGovernance(
  { permission: "view_logs", entityType: "logs" },
  async (req) => {
    const type = req.nextUrl.searchParams.get("type") ?? "audit";
    const actor_id = req.nextUrl.searchParams.get("actor") ?? undefined;
    const entity_id = req.nextUrl.searchParams.get("entity") ?? undefined;
    const filters = { actor_id, entity_id };
    const entries = type === "access" ? listAccessLog(filters) : listAuditLog(filters);
    return NextResponse.json({ entries });
  }
);
