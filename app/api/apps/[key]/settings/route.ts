import { NextResponse } from "next/server";
import { withGovernance } from "@/platform/withGovernance";
import { appRegistry } from "@/platform/appRegistry";
import {
  getAppSettings,
  updateAppSettings,
  LINKED_DATABASES,
  type LinkedDatabase,
} from "@/platform/appSettings";
import { writeAudit } from "@/platform/audit";
import { hasPermission, type Role } from "@/platform/roles";

const ROLES: Role[] = ["reviewer", "admin"];

// Read an app's settings. Both roles may view; only admins may change them.
export const GET = withGovernance(
  {
    permission: "view_app_settings",
    entityType: "app_settings",
    getEntityId: (_req, ctx) => ctx.params.key,
  },
  async (_req, ctx, actor) => {
    const app = appRegistry.find((a) => a.key === ctx.params.key);
    const settings = getAppSettings(ctx.params.key);
    if (!app || !settings) return NextResponse.json({ error: "App not found" }, { status: 404 });
    return NextResponse.json({
      app: { key: app.key, name: app.name, description: app.description, icon: app.icon },
      settings,
      databases: LINKED_DATABASES,
      roles: ROLES,
      canManage: hasPermission(actor.role, "manage_app_settings"),
    });
  }
);

// Change who can see the app and which database it is linked to. Admin-only,
// with a domain audit entry recording the before/after state.
export const PUT = withGovernance(
  {
    permission: "manage_app_settings",
    entityType: "app_settings",
    getEntityId: (_req, ctx) => ctx.params.key,
  },
  async (req, ctx, actor) => {
    const before = getAppSettings(ctx.params.key);
    if (!before) return NextResponse.json({ error: "App not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as {
      visible_to_roles?: unknown;
      linked_database?: unknown;
    };

    const roles = body.visible_to_roles;
    if (!Array.isArray(roles) || roles.length === 0 || !roles.every((r) => ROLES.includes(r as Role))) {
      return NextResponse.json(
        { error: "visible_to_roles must be a non-empty array of valid roles" },
        { status: 400 }
      );
    }
    if (!roles.includes("admin")) {
      return NextResponse.json(
        { error: "Admins cannot be locked out: visible_to_roles must include 'admin'" },
        { status: 400 }
      );
    }

    const database = body.linked_database;
    if (typeof database !== "string" || !LINKED_DATABASES.includes(database as LinkedDatabase)) {
      return NextResponse.json(
        { error: `linked_database must be one of: ${LINKED_DATABASES.join(", ")}` },
        { status: 400 }
      );
    }

    const after = updateAppSettings(
      ctx.params.key,
      { visible_to_roles: roles as Role[], linked_database: database as LinkedDatabase },
      actor.id
    );

    writeAudit({
      actor_id: actor.id,
      action: "app.settings.update",
      entity_type: "app_settings",
      entity_id: ctx.params.key,
      before_state: { visible_to_roles: before.visible_to_roles, linked_database: before.linked_database },
      after_state: { visible_to_roles: after.visible_to_roles, linked_database: after.linked_database },
    });

    return NextResponse.json({ settings: after });
  }
);
