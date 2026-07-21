import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { getDb } from "@/platform/config";
import { VIEWING_AS_COOKIE } from "@/platform/currentUser";

// Identity stub endpoint: sets the "Viewing as:" cookie. Part of the stubbed
// authentication described in platform/currentUser.ts.
export const POST = withGovernance(
  { permission: "view_cases", entityType: "identity" },
  async (req) => {
    const body = (await req.json().catch(() => ({}))) as { userId?: string };
    const user = body.userId
      ? getDb().prepare("SELECT id FROM users WHERE id = ?").get(body.userId)
      : undefined;
    if (!user) return NextResponse.json({ error: "Unknown user" }, { status: 400 });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(VIEWING_AS_COOKIE, body.userId!, { path: "/", sameSite: "lax" });
    return res;
  }
);
