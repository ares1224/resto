import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { EmptyState } from "@/components/ui/EmptyState";
import { SupplierCreateForm } from "@/components/stocks/SupplierCreateForm";
import { FournisseurCard } from "@/components/stocks/FournisseurCard";

export default async function FournisseursPage() {
  const db = await getDb();

  return (
    <div className="space-y-6">
      <Link href="/stocks" className="text-sm text-amber-700 hover:underline">
        ← Stocks
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Fiches fournisseurs</h1>
        <SupplierCreateForm />
      </div>
      {db.suppliers.length === 0 ? (
        <EmptyState
          title="Aucun fournisseur enregistré"
          description="Créez vos fiches fournisseurs pour lier vos produits en stock et suivre les délais de livraison."
          actionLabel="Ajouter un fournisseur"
          actionHref="/stocks/fournisseurs"
          buttonSize="sm"
        />
      ) : (
        <div className="space-y-4">
          {db.suppliers.map((sup) => {
            const prices = db.priceHistory.filter((p) => p.supplierId === sup.id);
            const items = db.stockItems.filter((s) => s.supplierId === sup.id);
            return (
              <FournisseurCard
                key={sup.id}
                supplier={sup}
                products={items.map((i) => ({
                  id: i.id,
                  name: i.name,
                  unitPrice: i.unitPrice,
                  unit: i.unit,
                }))}
                prices={prices.map((p) => {
                  const item = db.stockItems.find((s) => s.id === p.stockItemId);
                  return {
                    id: p.id,
                    label: item?.name ?? "Produit",
                    price: p.price,
                    date: p.date,
                  };
                })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
