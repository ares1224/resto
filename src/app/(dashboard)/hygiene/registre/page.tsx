import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function RegistrePage() {
  const db = await getDb();
  const today = new Date().toISOString().split("T")[0];
  const recentChecks = db.haccpChecks.slice(-30).reverse();

  return (
    <div className="space-y-6">
      <Link href="/hygiene" className="text-sm text-amber-700 hover:underline">← Hygiène</Link>
      <h1 className="text-2xl font-bold">Registre sanitaire numérique</h1>
      <p className="text-stone-500">Document consultable en cas de contrôle — {db.settings.restaurantName}</p>
      <Card title="Contrôles obligatoires">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-left text-stone-500">
                <th className="pb-2">Contrôle</th>
                <th className="pb-2">Catégorie</th>
                <th className="pb-2">Échéance</th>
                <th className="pb-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {db.complianceReminders.map((r) => (
                <tr key={r.id} className="border-b border-stone-50">
                  <td className="py-2">{r.title}</td>
                  <td className="py-2">{r.category}</td>
                  <td className="py-2">{r.dueDate}</td>
                  <td className="py-2">
                    <Badge variant={r.completed ? "success" : new Date(r.dueDate) < new Date() ? "danger" : "warning"}>
                      {r.completed ? "Fait" : new Date(r.dueDate) < new Date() ? "En retard" : "À planifier"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Relevés HACCP récents">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-stone-500">
                <th className="pb-2">Date</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Contrôle</th>
                <th className="pb-2">Valeur</th>
                <th className="pb-2">Horodatage</th>
              </tr>
            </thead>
            <tbody>
              {recentChecks.map((c) => (
                <tr key={c.id} className="border-b border-stone-50">
                  <td className="py-2">{c.date}</td>
                  <td className="py-2">{c.type}</td>
                  <td className="py-2">{c.label}</td>
                  <td className="py-2">{c.value ?? "—"}</td>
                  <td className="py-2">{c.completedAt?.slice(0, 16) ?? "Non fait"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-stone-400">Registre généré le {today}</p>
    </div>
  );
}
