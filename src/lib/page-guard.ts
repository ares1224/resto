import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db/store";
import {
  hasPermission,
  DEFAULT_MANAGER_PERMISSIONS,
  type Permission,
} from "@/lib/permissions";
import type { Session } from "@/lib/auth";

export async function requirePagePermission(
  permission: Permission
): Promise<{ session: Session; managerPermissions: typeof DEFAULT_MANAGER_PERMISSIONS }> {
  const session = await getSession();
  if (!session) redirect("/login");
  const db = await getDb();
  const managerPermissions =
    db.settings.managerPermissions ?? DEFAULT_MANAGER_PERMISSIONS;
  if (!hasPermission(session, permission, managerPermissions)) {
    redirect("/dashboard");
  }
  return { session, managerPermissions };
}

export async function requireGerant(): Promise<Session> {
  const session = await getSession();
  if (!session || session.role !== "gerant") redirect("/dashboard");
  return session;
}

export async function getManagerPermissions() {
  const db = await getDb();
  return db.settings.managerPermissions ?? DEFAULT_MANAGER_PERMISSIONS;
}
