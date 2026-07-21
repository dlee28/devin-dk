import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { getAppDb } from "@/platform/databases";
import { writeAudit } from "@/platform/audit";

// W5: override (admin-only via 'override_decision' permission). Reopens a
// decided case to in_review. Rationale REQUIRED.
export const POST = withGovernance(
  {
    permission: "override_decision",
    entityType: "kyc_case",
    getEntityId: (_req, ctx) => ctx.params.id,
  },
  async (req, ctx, actor) => {
    const body = (await req.json().catch(() => ({}))) as { rationale?: string };
    const rationale = (body.rationale ?? "").trim();
    // Compliance basis: audit-ready KYC requires enforced reasoning at the moment of decision.
    if (rationale.length < 10) {
      return NextResponse.json(
        { error: "A written rationale (minimum 10 characters) is required to override a decision." },
        { status: 400 }
      );
    }

    const db = getAppDb("kyc");
    const kycCase = db.prepare("SELECT * FROM kyc_cases WHERE id = ?").get(ctx.params.id) as
      | { id: string; status: string; decided_at: string | null; decided_by: string | null }
      | undefined;
    if (!kycCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    if (kycCase.status !== "approved" && kycCase.status !== "rejected") {
      return NextResponse.json(
        { error: `Only finalized (approved/rejected) cases can be overridden; this case is '${kycCase.status}'.` },
        { status: 400 }
      );
    }

    const before = { status: kycCase.status, decided_at: kycCase.decided_at, decided_by: kycCase.decided_by };
    const after = { status: "in_review", decided_at: null, decided_by: null };

    db.prepare("UPDATE kyc_cases SET status = 'in_review', decided_at = NULL, decided_by = NULL WHERE id = ?").run(
      kycCase.id
    );

    writeAudit({
      actor_id: actor.id,
      action: "case.override",
      entity_type: "kyc_case",
      entity_id: kycCase.id,
      before_state: before,
      after_state: after,
      rationale,
    });

    return NextResponse.json({ ok: true });
  }
);
