/**
 * PLATFORM LAYER - governance wrapper for API route handlers.
 * Every route handler in app/api/** is wrapped by withGovernance. It:
 *   1. resolves the actor (platform/currentUser.ts - stubbed identity),
 *   2. checks the declared permission against the role map (platform/roles.ts),
 *   3. optionally runs a contextual authorize() rule (still platform-enforced),
 *   4. writes a Layer-2 access_log row for EVERY request - allowed or denied.
 * Apps therefore inherit RBAC and access logging by existing; route handlers
 * contain no role checks and no log writes.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./currentUser";
import { hasPermission, type Permission, type User } from "./roles";
import { logAccess } from "./accessLog";

interface RouteContext {
  params: Record<string, string>;
}

export type GovernedHandler = (
  req: NextRequest,
  ctx: RouteContext,
  actor: User
) => Promise<NextResponse> | NextResponse;

export interface GovernanceOptions {
  /** Permission required to hit this endpoint (from platform/roles.ts). */
  permission: Permission;
  /** Entity type recorded in the access log. */
  entityType: string;
  /** Extract the entity id from the request, if any. */
  getEntityId?: (req: NextRequest, ctx: RouteContext) => string | null;
  /**
   * Optional contextual rule evaluated after the permission check (e.g. "a
   * reviewer may not decide a case assigned to someone else"). Return an
   * error message to deny. Runs inside the platform layer so denials are
   * still logged uniformly.
   */
  authorize?: (actor: User, req: NextRequest, ctx: RouteContext) => string | null;
}

/**
 * Governance for server-rendered pages that don't go through app/api (the
 * launcher). Resolves the actor and writes the Layer-2 access log row, so the
 * page itself contains no logging code.
 */
export function governPageView(pathname: string, entityType: string): User {
  const actor = getCurrentUser();
  logAccess({
    actor_id: actor.id,
    actor_role: actor.role,
    method: "GET",
    endpoint: pathname,
    entity_type: entityType,
    entity_id: null,
    outcome: "allowed",
  });
  return actor;
}

export function withGovernance(options: GovernanceOptions, handler: GovernedHandler) {
  return async (req: NextRequest, ctx: RouteContext): Promise<NextResponse> => {
    const actor = getCurrentUser();
    const entityId = options.getEntityId ? options.getEntityId(req, ctx) : null;

    const record = (outcome: "allowed" | "denied") =>
      logAccess({
        actor_id: actor.id,
        actor_role: actor.role,
        method: req.method,
        endpoint: req.nextUrl.pathname,
        entity_type: options.entityType,
        entity_id: entityId,
        outcome,
      });

    if (!hasPermission(actor.role, options.permission)) {
      record("denied");
      return NextResponse.json(
        { error: `Forbidden: role '${actor.role}' lacks permission '${options.permission}'` },
        { status: 403 }
      );
    }

    if (options.authorize) {
      const denial = options.authorize(actor, req, ctx);
      if (denial) {
        record("denied");
        return NextResponse.json({ error: denial }, { status: 403 });
      }
    }

    record("allowed");
    return handler(req, ctx, actor);
  };
}
