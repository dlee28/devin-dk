import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { getAppDb } from "@/platform/databases";

// Flags app (stretch): listing is available to both roles.
export const GET = withGovernance(
  { permission: "toggle_staging_flag", entityType: "feature_flag" },
  async () => {
    const flags = getAppDb("flags")
      .prepare("SELECT * FROM feature_flags ORDER BY environment, key")
      .all();
    return NextResponse.json({ flags });
  }
);
