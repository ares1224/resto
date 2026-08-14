import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { requireGerant } from "@/lib/page-guard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AuditPage() {
  await requireGerant();
  const db = await getDb();

  return (
    <div className="space-y-6">
      <Link href="/parametres/droits" className="text-sm text-amber-700 hover:underline">← Droits manager</Link>
      <h1 className="text-2xl font-extrabold text-amber-950">Journal d&apos;audit</h1>
      <p className="font-medium text-amber-800">Historique des actions sensibles horodatées</p>
      <Card title={`${db.auditLog.length} entrée(s)`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Date</th>
                <th className="pb-2">Utilisateur</th>
                <th className="pb-2">Rôle</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Détails</th>
              </tr>
            </thead>
            <tbody>
              {db.auditLog.map((entry) => (
                <tr key={entry.id} className="border-b border-amber-50">
                  <td className="py-2 whitespace-nowrap">{entry.createdAt.slice(0, 19).replace("T", " ")}</td>
                  <td className="py-2 font-medium">{entry.userName}</td>
                  <td className="py-2"><Badge variant="default">{entry.role}</Badge></td>
                  <td className="py-2 font-semibold">{entry.action}</td>
                  <td className="py-2">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
