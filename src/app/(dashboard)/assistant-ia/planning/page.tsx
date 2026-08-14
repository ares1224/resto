import Link from "next/link";
import { requireGerant } from "@/lib/page-guard";
import { getDb } from "@/lib/db/store";
import { getEmployeesForPlanning } from "@/lib/data-access";
import { getSession } from "@/lib/auth";
import { AiPageHeader } from "@/components/ai/AiPageHeader";
import { PlanningAiPanel } from "@/components/ai/AiPanels";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

function weekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

export default async function AssistantIaPlanningPage() {
  await requireGerant();
  const session = await getSession();
  const db = await getDb();
  const ws = weekStart();
  const employees = session ? getEmployeesForPlanning(db, session) : [];

  return (
    <div className="space-y-6">
      <AiPageHeader
        title="Génération automatique du planning"
        description="Proposition basée sur les disponibilités, la fréquentation estimée et les contraintes légales (repos, heures max). Rien n'est appliqué tant que vous ne validez pas — vous pourrez ensuite ajuster chaque créneau dans le planning."
      />

      {employees.length === 0 ? (
        <EmptyState
          title="Aucun employé enregistré"
          description="Ajoutez des employés avant de générer un planning automatique."
          actionLabel="Ajouter un employé"
          actionHref="/personnel/employes"
        />
      ) : (
        <>
          <Card title={`Semaine du ${ws}`}>
            <p className="mb-4 text-sm text-amber-900">
              La proposition couvre la semaine en cours. Après validation, ouvrez le planning pour affiner manuellement
              les créneaux.
            </p>
            <PlanningAiPanel
              weekStart={ws}
              employees={employees.map((e) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName }))}
            />
          </Card>
          <Link href="/personnel/planning" className="quick-link inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm">
            Ouvrir le planning hebdomadaire →
          </Link>
        </>
      )}
    </div>
  );
}
