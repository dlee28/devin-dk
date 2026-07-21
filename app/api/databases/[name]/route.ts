import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { removeDatabase } from "@/platform/databases";

// Remove a registered data database (refused while any app is linked to it).
// Admin-only, audited.
export const DELETE = withGovernance(
  {
    permission: "manage_app_settings",
    entityType: "database",
    getEntityId: (_req, ctx) => ctx.params.name,
  },
  async (_req, ctx, actor) => {
    const error = removeDatabase(ctx.params.name, actor.id);
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
);
