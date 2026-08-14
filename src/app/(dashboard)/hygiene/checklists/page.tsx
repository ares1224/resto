import { getDb } from "@/lib/db/store";
import { HaccpChecklist } from "@/components/hygiene/HaccpChecklist";

export default async function ChecklistsPage() {
  const db = await getDb();
  const today = new Date().toISOString().split("T")[0];
  const checks = db.haccpChecks.filter((c) => c.date === today);
  const employees = Object.fromEntries(db.employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]));

  return <HaccpChecklist checks={checks} employees={employees} />;
}
