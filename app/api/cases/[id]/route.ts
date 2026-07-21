import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { getDb } from "@/platform/config";
import { auditHistoryForEntity } from "@/platform/audit";

// Case detail: case fields, notes, and this case's audit history (Layer 3),
// visible to both roles - traceable justification for every decision.
export const GET = withGovernance(
  {
    permission: "view_cases",
    entityType: "kyc_case",
    getEntityId: (_req, ctx) => ctx.params.id,
  },
  async (_req, ctx) => {
    const db = getDb();
    const kycCase = db
      .prepare(
        `SELECT c.*, u.name AS assignee_name, d.name AS decided_by_name
         FROM kyc_cases c
         LEFT JOIN users u ON u.id = c.assigned_to
         LEFT JOIN users d ON d.id = c.decided_by
         WHERE c.id = ?`
      )
      .get(ctx.params.id);
    if (!kycCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    const notes = db
      .prepare(
        `SELECT n.*, u.name AS author_name FROM case_notes n
         JOIN users u ON u.id = n.author_id
         WHERE n.case_id = ? ORDER BY n.created_at DESC`
      )
      .all(ctx.params.id);

    const history = auditHistoryForEntity("kyc_case", ctx.params.id);
    return NextResponse.json({ case: kycCase, notes, history });
  }
);
