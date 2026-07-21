import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { getAppDb } from "@/platform/databases";
import { writeAudit } from "@/platform/audit";
import { hasPermission } from "@/platform/roles";

interface FlagRow {
  id: string;
  key: string;
  enabled: number;
  environment: "staging" | "production";
}

// Toggling: admin-only for production flags, both roles for staging.
// Every toggle writes an audit_log entry (rationale optional).
export const POST = withGovernance(
  {
    permission: "toggle_staging_flag",
    entityType: "feature_flag",
    getEntityId: (_req, ctx) => ctx.params.id,
    authorize: (actor, _req, ctx) => {
      const flag = getAppDb("flags")
        .prepare("SELECT environment FROM feature_flags WHERE id = ?")
        .get(ctx.params.id) as { environment: string } | undefined;
      if (flag?.environment === "production" && !hasPermission(actor.role, "toggle_production_flag")) {
        return "Forbidden: only admins can toggle production flags";
      }
      return null;
    },
  },
  async (req, ctx, actor) => {
    const body = (await req.json().catch(() => ({}))) as { rationale?: string };
    const db = getAppDb("flags");
    const flag = db.prepare("SELECT * FROM feature_flags WHERE id = ?").get(ctx.params.id) as FlagRow | undefined;
    if (!flag) return NextResponse.json({ error: "Flag not found" }, { status: 404 });

    const newEnabled = flag.enabled ? 0 : 1;
    const updatedAt = new Date().toISOString();
    db.prepare("UPDATE feature_flags SET enabled = ?, updated_at = ? WHERE id = ?").run(
      newEnabled,
      updatedAt,
      flag.id
    );

    writeAudit({
      actor_id: actor.id,
      action: newEnabled ? "flag.enable" : "flag.disable",
      entity_type: "feature_flag",
      entity_id: flag.id,
      before_state: { enabled: !!flag.enabled },
      after_state: { enabled: !!newEnabled },
      rationale: body.rationale?.trim() || null,
    });

    return NextResponse.json({ ok: true });
  }
);
