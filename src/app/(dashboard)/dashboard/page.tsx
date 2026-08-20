import { getDb, updateDb } from "@/lib/db/store";
import { runAlertEngine } from "@/lib/business";
import { getSession, getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GerantDashboard } from "@/components/dashboard/GerantDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "superadmin") redirect("/admin");

  const user = await getCurrentUser();
  if (user?.mustChangePassword) redirect("/mon-espace/mot-de-passe?required=1");

  await updateDb((db) => runAlertEngine(db));
  const db = await getDb();

  if (session.role === "gerant") {
    return <GerantDashboard db={db} />;
  }
  if (session.role === "manager") {
    return <ManagerDashboard db={db} />;
  }
  return <EmployeeDashboard db={db} session={session} />;
}
