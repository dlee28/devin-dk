import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { getAppDb } from "@/platform/databases";
import { writeAudit } from "@/platform/audit";

// W4: reassignment (admin-only via 'reassign_case' permission). Sets
// assigned_to, moves pending -> in_review, writes an audit entry.
// Rationale is optional here.
export const POST = withGovernance(
  {
    permission: "reassign_case",
    entityType: "kyc_case",
    getEntityId: (_req, ctx) => ctx.params.id,
  },
  async (req, ctx, actor) => {
    const body = (await req.json().catch(() => ({}))) as { assigned_to?: string; rationale?: string };
    if (!body.assigned_to) {
      return NextResponse.json({ error: "assigned_to is required" }, { status: 400 });
    }

    const db = getAppDb("kyc");
    const kycCase = db.prepare("SELECT * FROM kyc_cases WHERE id = ?").get(ctx.params.id) as
      | { id: string; status: string; assigned_to: string | null }
      | undefined;
    if (!kycCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    const assignee = db.prepare("SELECT id FROM platform.users WHERE id = ?").get(body.assigned_to);
    if (!assignee) return NextResponse.json({ error: "Assignee not found" }, { status: 400 });

    const newStatus = kycCase.status === "pending" ? "in_review" : kycCase.status;
    const before = { status: kycCase.status, assigned_to: kycCase.assigned_to };
    const after = { status: newStatus, assigned_to: body.assigned_to };

    db.prepare("UPDATE kyc_cases SET status = ?, assigned_to = ? WHERE id = ?").run(
      newStatus,
      body.assigned_to,
      kycCase.id
    );

    writeAudit({
      actor_id: actor.id,
      action: "case.reassign",
      entity_type: "kyc_case",
      entity_id: kycCase.id,
      before_state: before,
      after_state: after,
      rationale: body.rationale?.trim() || null,
    });

    return NextResponse.json({ ok: true });
  }
);
