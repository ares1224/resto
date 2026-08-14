import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db/store";
import { isSetupComplete } from "@/lib/db/seed";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/lib/permissions";
import { AppShell } from "@/components/AppShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const db = await getDb();
  if (!isSetupComplete(db)) redirect("/setup");
  const session = await getSession();
  if (!session) redirect("/login");
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
}
