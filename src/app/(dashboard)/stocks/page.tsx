import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { updateDb } from "@/lib/db/store";
import { runAlertEngine } from "@/lib/business";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleLinks } from "@/components/ModuleLinks";

export default async function StocksPage() {
  await updateDb((db) => runAlertEngine(db));
  const db = await getDb();
  const lowStock = db.stockItems.filter((s) => s.quantity <= s.minThreshold);
  const expiring = db.stockItems.filter((s) => {
    if (!s.expiryDate) return false;
    const days = Math.ceil((new Date(s.expiryDate).getTime() - Date.now()) / 86400000);
    return days <= 3 && days >= 0;
  });
  const pendingOrders = (db.supplierOrderDrafts ?? []).filter((d) => d.status === "pending").length;

  return (
    <div className="space-y-6">
      <ModuleLinks
        title="Stocks & fournisseurs"
        links={[
          { href: "/stocks/inventaire", title: "Inventaire", desc: "Temps réel, seuils d'alerte" },
          { href: "/stocks/commandes", title: "Commandes fournisseurs", desc: "Envoyer un message de commande" },
          { href: "/stocks/courses", title: "Liste de courses", desc: "Générée automatiquement" },
          { href: "/stocks/fournisseurs", title: "Fournisseurs", desc: "Délais, fiabilité, historique prix" },
          { href: "/stocks/gaspillage", title: "Gaspillage", desc: "Quantité et valeur perdue" },
        ]}
      />
      {db.stockItems.length === 0 && db.suppliers.length === 0 ? (
        <EmptyState
          title="Aucun stock ni fournisseur"
          description="Commencez par enregistrer vos fournisseurs, puis ajoutez vos produits en inventaire."
          actionLabel="Ajouter un fournisseur"
          actionHref="/stocks/fournisseurs"
        />
      ) : (
        <>
          {(pendingOrders > 0 || lowStock.length > 0) && (
            <Card title="Commandes fournisseurs" className="border-amber-200 bg-amber-50/30">
              <p className="mb-3 text-sm text-stone-600">
                {pendingOrders > 0
                  ? `${pendingOrders} brouillon(s) de commande en attente de validation.`
                  : "Des produits sont sous le seuil — préparez une commande fournisseur."}
              </p>
              <Link
                href="/stocks/commandes"
                className="inline-flex min-h-[36px] items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
              >
                Ouvrir les commandes fournisseurs →
              </Link>
            </Card>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={`Alertes stock (${lowStock.length})`}>
              {lowStock.length === 0 ? (
                <p className="text-sm text-stone-500">Aucune alerte de seuil</p>
              ) : (
                <ul className="space-y-2">
                  {lowStock.map((item) => (
                    <li key={item.id} className="flex justify-between rounded-lg bg-red-50 p-3 text-sm">
                      <span>{item.name}</span>
                      <Badge variant="danger">
                        {item.quantity} {item.unit} / min {item.minThreshold}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title={`Péremption proche (${expiring.length})`}>
              {expiring.length === 0 ? (
                <p className="text-sm text-stone-500">Aucune péremption imminente</p>
              ) : (
                expiring.map((item) => (
                  <div key={item.id} className="mb-2 flex justify-between rounded-lg bg-amber-50 p-3 text-sm">
                    <span>{item.name}</span>
                    <span className="text-amber-800">{item.expiryDate}</span>
                  </div>
                ))
              )}
            </Card>
          </div>
        </>
      )}
      <Link href="/api/export?type=stock&format=csv" className="text-sm text-amber-700 hover:underline">
        Exporter inventaire (CSV)
      </Link>
    </div>
  );
}
