import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { getDb } from "@/platform/config";
import { randomUUID } from "node:crypto";

export const POST = withGovernance(
  {
    permission: "view_cases",
    entityType: "kyc_case",
    getEntityId: (_req, ctx) => ctx.params.id,
  },
  async (req, ctx, actor) => {
    const body = (await req.json().catch(() => ({}))) as { body?: string };
    const text = (body.body ?? "").trim();
    if (!text) return NextResponse.json({ error: "Note body is required" }, { status: 400 });

    const db = getDb();
    const exists = db.prepare("SELECT id FROM kyc_cases WHERE id = ?").get(ctx.params.id);
    if (!exists) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    db.prepare(
      "INSERT INTO case_notes (id, case_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), ctx.params.id, actor.id, text, new Date().toISOString());
    return NextResponse.json({ ok: true });
  }
);
