import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function MaintenancePage() {
  const db = await getDb();

  return (
    <div className="space-y-6">
      <Link href="/operations" className="text-sm text-amber-700 hover:underline">← Opérationnel</Link>
      <h1 className="text-2xl font-bold">Carnet de maintenance</h1>
      <div className="space-y-4">
        {db.equipment.map((eq) => (
          <Card key={eq.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{eq.name}</h3>
                <p className="text-sm text-stone-500">{eq.location}</p>
                <p className="text-sm">Dernière maintenance : {eq.lastMaintenance} · Prochaine : {eq.nextMaintenance}</p>
                {eq.contractProvider && <p className="text-sm">Contrat : {eq.contractProvider}</p>}
              </div>
              <Badge variant={eq.status === "ok" ? "success" : eq.status === "maintenance" ? "warning" : "danger"}>
                {eq.status}
              </Badge>
            </div>
            {eq.incidents.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold">Incidents</h4>
                <ul className="mt-1 text-sm">
                  {eq.incidents.map((inc, i) => (
                    <li key={i} className={inc.resolved ? "text-stone-400" : "text-red-700"}>
                      {inc.date} — {inc.description} {inc.resolved ? "(résolu)" : "(en cours)"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
