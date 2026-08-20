import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb, TenantError } from "@/lib/db/store";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/lib/permissions";
import { AppShell } from "@/components/AppShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "superadmin") redirect("/admin");

  try {
    const db = await getDb();
    const managerPermissions = db.settings.managerPermissions ?? DEFAULT_MANAGER_PERMISSIONS;
    const sessionTimeoutMinutes = db.settings.sessionTimeoutMinutes ?? 30;
    return (
      <AppShell
        session={session}
        managerPermissions={managerPermissions}
        sessionTimeoutMinutes={sessionTimeoutMinutes}
        restaurantName={db.settings.restaurantName}
      >
        {children}
      </AppShell>
    );
  } catch (e) {
    if (e instanceof TenantError) redirect("/login");
    throw e;
  }
}
