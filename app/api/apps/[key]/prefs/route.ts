import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { getAppSettings, getUserPrefs, setUserPrefs } from "@/platform/appSettings";

// A user's own values for the app's customizable options. Always scoped to
// the acting user - there is no way to read or write another user's prefs.
export const GET = withGovernance(
  {
    permission: "view_app_settings",
    entityType: "user_app_prefs",
    getEntityId: (_req, ctx) => ctx.params.key,
  },
  async (_req, ctx, actor) => {
    if (!getAppSettings(ctx.params.key)) return NextResponse.json({ error: "App not found" }, { status: 404 });
    return NextResponse.json({ prefs: getUserPrefs(actor.id, ctx.params.key) });
  }
);

export const PUT = withGovernance(
  {
    permission: "view_app_settings",
    entityType: "user_app_prefs",
    getEntityId: (_req, ctx) => ctx.params.key,
  },
  async (req, ctx, actor) => {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Request body must be an object of pref values" }, { status: 400 });
    }
    const err = setUserPrefs(actor.id, ctx.params.key, body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    return NextResponse.json({ prefs: getUserPrefs(actor.id, ctx.params.key) });
  }
);
