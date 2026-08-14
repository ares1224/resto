import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { requirePagePermission } from "@/lib/page-guard";
import { getCashFlowForSession } from "@/lib/data-access";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CashFlowCreateForm } from "@/components/finances/CashFlowCreateForm";

export default async function TresoreriePage() {
  const { session } = await requirePagePermission("view_treasury");
  const db = await getDb();
  const cashFlow = getCashFlowForSession(db, session);
  const income = cashFlow.filter((c) => c.type === "income").reduce((s, c) => s + c.amount, 0);
  const expenses = cashFlow.filter((c) => c.type === "expense").reduce((s, c) => s + c.amount, 0);
  const fixed = cashFlow.filter((c) => c.type === "expense" && c.isFixed).reduce((s, c) => s + c.amount, 0);
  const balance = income - expenses;

  return (
    <div className="space-y-6">
      <Link href="/finances" className="text-sm text-amber-700 hover:underline">← Finances</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Trésorerie</h1>
        <CashFlowCreateForm />
      </div>
      {cashFlow.length === 0 ? (
        <EmptyState
          title="Aucun mouvement enregistré"
          description="Ajoutez vos encaissements et sorties pour suivre la trésorerie de votre établissement."
          actionLabel="Ajouter un mouvement"
          actionHref="/finances/tresorerie"
        />
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card title="Encaissements"><p className="text-2xl font-bold text-green-700">+{income.toFixed(0)} €</p></Card>
            <Card title="Sorties"><p className="text-2xl font-bold text-red-700">-{expenses.toFixed(0)} €</p></Card>
            <Card title="Charges fixes"><p className="text-2xl font-bold">{fixed.toFixed(0)} €</p></Card>
            <Card title="Solde"><p className={`text-2xl font-bold ${balance >= 0 ? "text-green-700" : "text-red-700"}`}>{balance.toFixed(0)} €</p></Card>
          </div>
          <Card title="Mouvements">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b text-left text-stone-500">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Catégorie</th>
                    <th className="pb-2">Montant</th>
                    <th className="pb-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlow.map((entry) => (
                    <tr key={entry.id} className="border-b border-stone-50">
                      <td className="py-2">{entry.date}</td>
                      <td className="py-2">
                        <Badge variant={entry.type === "income" ? "success" : "danger"}>
                          {entry.type === "income" ? "Entrée" : "Sortie"}
                        </Badge>
                      </td>
                      <td className="py-2">{entry.category}{entry.isFixed && " (fixe)"}</td>
                      <td className="py-2">{entry.type === "income" ? "+" : "-"}{entry.amount.toFixed(2)} €</td>
                      <td className="py-2">{entry.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
