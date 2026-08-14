import { ModuleLinks } from "@/components/ModuleLinks";
import { getDb } from "@/lib/db/store";
import { updateDb } from "@/lib/db/store";
import { runAlertEngine } from "@/lib/business";
import { Card } from "@/components/ui/Card";

export default async function HygienePage() {
  await updateDb((db) => runAlertEngine(db));
  const db = await getDb();
  const today = new Date().toISOString().split("T")[0];
  const todayChecks = db.haccpChecks.filter((c) => c.date === today);
  const done = todayChecks.filter((c) => c.completed).length;
  const overdue = db.complianceReminders.filter((r) => !r.completed && new Date(r.dueDate) < new Date()).length;

  return (
    <div className="space-y-6">
      <ModuleLinks
        title="Hygiène & conformité"
        links={[
          { href: "/hygiene/checklists", title: "Checklists HACCP", desc: "Températures, nettoyage, horodatage" },
          { href: "/hygiene/registre", title: "Registre sanitaire", desc: "Consultable en cas de contrôle" },
          { href: "/hygiene/allergenes", title: "Allergènes", desc: "Générés depuis les recettes" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Checklists du jour"><p className="text-2xl font-bold">{done}/{todayChecks.length}</p></Card>
        <Card title="Contrôles en retard"><p className="text-2xl font-bold text-red-700">{overdue}</p></Card>
        <Card title="Rappels actifs"><p className="text-2xl font-bold">{db.complianceReminders.filter((r) => !r.completed).length}</p></Card>
      </div>
    </div>
  );
}
