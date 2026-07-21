import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { getDb } from "@/platform/config";

// Flags app (stretch): listing is available to both roles.
export const GET = withGovernance(
  { permission: "toggle_staging_flag", entityType: "feature_flag" },
  async () => {
    const flags = getDb()
      .prepare("SELECT * FROM feature_flags ORDER BY environment, key")
      .all();
    return NextResponse.json({ flags });
  }
);
