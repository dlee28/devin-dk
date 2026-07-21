import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { getAppDb } from "@/platform/databases";

// Queue listing with status filter + sorting. Governance (RBAC + access
// logging) is inherited from withGovernance; nothing here checks roles.
export const GET = withGovernance(
  { permission: "view_cases", entityType: "kyc_case" },
  async (req) => {
    const status = req.nextUrl.searchParams.get("status");
    const sort = req.nextUrl.searchParams.get("sort") ?? "created_at";
    const dir = req.nextUrl.searchParams.get("dir") === "asc" ? "ASC" : "DESC";
    const sortCol = sort === "risk_score" ? "risk_score" : "created_at";

    const db = getAppDb("kyc");
    const params: string[] = [];
    let where = "";
    if (status && status !== "all") {
      where = "WHERE c.status = ?";
      params.push(status);
    }
    const cases = db
      .prepare(
        `SELECT c.*, u.name AS assignee_name
         FROM kyc_cases c LEFT JOIN platform.users u ON u.id = c.assigned_to
         ${where} ORDER BY c.${sortCol} ${dir}`
      )
      .all(...params);

    const counts = db
      .prepare("SELECT status, COUNT(*) AS n FROM kyc_cases GROUP BY status")
      .all() as { status: string; n: number }[];

    return NextResponse.json({ cases, counts });
  }
);
