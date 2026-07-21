import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { listUsers } from "@/platform/currentUser";

export const GET = withGovernance(
  { permission: "view_cases", entityType: "user" },
  async () => NextResponse.json({ users: listUsers() })
);
