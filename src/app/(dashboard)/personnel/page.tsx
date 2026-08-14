import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { getSession } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function PersonnelPage() {
  const session = await getSession();
  const db = await getDb();
  const activeEmployees = db.employees.filter((e) => e.active);
  const today = new Date().toISOString().split("T")[0];
  const absencesToday = db.absences.filter((a) => a.date === today).length;
  const pendingReplacements = db.replacementOffers.filter((o) => o.status === "pending").length;

  const links = [
    { href: "/personnel/planning", title: "Planning", desc: "Grille hebdo, coupures, heures de pointe" },
    { href: "/personnel/employes", title: "Fiches employés", desc: "Contrats, documents, formations, notes RH" },
    { href: "/personnel/pointage", title: "Pointeuse", desc: "Heures effectives vs planifiées" },
    { href: "/personnel/disponibilites", title: "Disponibilités", desc: "Déclaration par les employés" },
    { href: "/personnel/remplacements", title: "Remplacement express", desc: "Propositions ciblées" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Personnel</h1>
      {(absencesToday > 0 || pendingReplacements > 0) && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {absencesToday > 0 && `${absencesToday} absence(s) aujourd'hui · `}
          {pendingReplacements > 0 && `${pendingReplacements} remplacement(s) en attente`}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <h3 className="font-semibold text-amber-800">{link.title}</h3>
              <p className="mt-1 text-sm text-stone-500">{link.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Card title="Équipe active">
        {activeEmployees.length === 0 ? (
          <EmptyState
            title="Aucun employé enregistré"
            description="Commencez par créer vos fiches employés pour planifier les shifts et gérer les accès."
            actionLabel="Ajouter votre premier employé"
            actionHref="/personnel/employes"
          />
        ) : (
          <div className="space-y-2">
            {activeEmployees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between rounded-lg bg-stone-50 p-3">
                <div>
                  <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                  <span className="ml-2 text-sm text-stone-500">{emp.role}</span>
                </div>
                <Badge variant="default">{emp.contractType}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
