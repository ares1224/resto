import { NextResponse } from "next/server";
import type { Session } from "@/lib/auth";
import { getSession } from "@/lib/auth";
import { getDb, TenantError } from "@/lib/db/store";
import {
  hasPermission,
  DEFAULT_MANAGER_PERMISSIONS,
  type Permission,
} from "@/lib/permissions";

export class ForbiddenError extends Error {
  status = 403;
}

export async function getSessionWithPermissions(): Promise<{
  session: Session;
  managerPermissions: typeof DEFAULT_MANAGER_PERMISSIONS;
}> {
  const session = await getSession();
  if (!session) throw new ForbiddenError("Unauthorized");
  if (session.role === "superadmin") throw new ForbiddenError("Forbidden");
  const db = await getDb();
  const managerPermissions =
    db.settings.managerPermissions ?? DEFAULT_MANAGER_PERMISSIONS;
  return { session, managerPermissions };
}

export async function requireApiPermission(
  permission: Permission
): Promise<Session> {
  const { session, managerPermissions } = await getSessionWithPermissions();
  if (!hasPermission(session, permission, managerPermissions)) {
    throw new ForbiddenError("Forbidden");
  }
  return session;
}

export async function requireApiRole(roles: Session["role"][]): Promise<Session> {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) {
    throw new ForbiddenError("Forbidden");
  }
  return session;
}

export async function requireSuperAdmin(): Promise<Session> {
  return requireApiRole(["superadmin"]);
}

export function apiError(error: unknown) {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof TenantError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
