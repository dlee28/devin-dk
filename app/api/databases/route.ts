import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { createDatabase, listDatabases } from "@/platform/databases";
import { getAllAppSettings } from "@/platform/appSettings";
import { hasPermission } from "@/platform/roles";

// Registered data databases, with which apps are currently linked to each.
export const GET = withGovernance(
  { permission: "view_app_settings", entityType: "database" },
  async (_req, _ctx, actor) => {
    const settings = Array.from(getAllAppSettings().values());
    const databases = listDatabases().map((d) => ({
      ...d,
      linked_by: settings
        .filter((s) => s.linked_database === d.name)
        .map((s) => s.app_key),
    }));
    return NextResponse.json({
      databases,
      canManage: hasPermission(actor.role, "manage_app_settings"),
    });
  }
);

// Link (create + register) a new data database. Admin-only, audited.
export const POST = withGovernance(
  {
    permission: "manage_app_settings",
    entityType: "database",
  },
  async (req, _ctx, actor) => {
    const body = (await req.json().catch(() => ({}))) as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const error = createDatabase(name, actor.id);
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ ok: true, name }, { status: 201 });
  }
);
