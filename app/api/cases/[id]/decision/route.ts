import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { getDb } from "@/platform/config";
import { writeAudit } from "@/platform/audit";
import { hasPermission } from "@/platform/roles";

interface CaseRow {
  id: string;
  status: string;
  assigned_to: string | null;
  decided_at: string | null;
  decided_by: string | null;
}

export const POST = withGovernance(
  {
    permission: "decide_case",
    entityType: "kyc_case",
    getEntityId: (_req, ctx) => ctx.params.id,
    // W6: a reviewer may decide an unassigned case or one assigned to them,
    // but not one assigned to someone else. Evaluated by the platform wrapper
    // so the denial is uniformly logged as outcome='denied'.
    authorize: (actor, _req, ctx) => {
      const row = getDb()
        .prepare("SELECT assigned_to FROM kyc_cases WHERE id = ?")
        .get(ctx.params.id) as { assigned_to: string | null } | undefined;
      if (
        row?.assigned_to &&
        row.assigned_to !== actor.id &&
        !hasPermission(actor.role, "decide_others_case")
      ) {
        return "Forbidden: this case is assigned to another reviewer";
      }
      return null;
    },
  },
  async (req, ctx, actor) => {
    const body = (await req.json().catch(() => ({}))) as { decision?: string; rationale?: string };
    const decision = body.decision;
    const rationale = (body.rationale ?? "").trim();

    if (decision !== "approved" && decision !== "rejected") {
      return NextResponse.json({ error: "decision must be 'approved' or 'rejected'" }, { status: 400 });
    }
    // W2: rationale required, server-side, minimum 10 characters.
    // Compliance basis: audit-ready KYC requires enforced reasoning at the moment of decision.
    if (rationale.length < 10) {
      return NextResponse.json(
        { error: "A written rationale (minimum 10 characters) is required for every decision." },
        { status: 400 }
      );
    }

    const db = getDb();
    const kycCase = db.prepare("SELECT * FROM kyc_cases WHERE id = ?").get(ctx.params.id) as CaseRow | undefined;
    if (!kycCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    // W1: decisions only from pending or in_review.
    if (kycCase.status !== "pending" && kycCase.status !== "in_review") {
      return NextResponse.json(
        { error: `Cannot decide a case in status '${kycCase.status}'. Only pending or in_review cases can be decided.` },
        { status: 400 }
      );
    }

    const decidedAt = new Date().toISOString();
    const before = { status: kycCase.status, decided_at: kycCase.decided_at, decided_by: kycCase.decided_by };
    const after = { status: decision, decided_at: decidedAt, decided_by: actor.id };

    db.prepare("UPDATE kyc_cases SET status = ?, decided_at = ?, decided_by = ? WHERE id = ?").run(
      decision,
      decidedAt,
      actor.id,
      kycCase.id
    );

    // W3: every decision writes the Layer-3 audit trail.
    writeAudit({
      actor_id: actor.id,
      action: decision === "approved" ? "case.approve" : "case.reject",
      entity_type: "kyc_case",
      entity_id: kycCase.id,
      before_state: before,
      after_state: after,
      rationale,
    });

    return NextResponse.json({ ok: true });
  }
);
