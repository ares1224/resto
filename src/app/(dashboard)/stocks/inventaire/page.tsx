import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { EmptyState } from "@/components/ui/EmptyState";
import { StockItemCreateForm } from "@/components/stocks/StockItemCreateForm";
import { DeliveryNoteImportPanel } from "@/components/stocks/DeliveryNoteImportPanel";
import { InventaireStockRow } from "@/components/stocks/InventaireStockRow";
import { InventaireStockCard } from "@/components/stocks/InventaireStockCard";

export default async function InventairePage() {
  const db = await getDb();
  const sorted = [...db.stockItems].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const suppliers = db.suppliers.map((s) => ({ id: s.id, name: s.name }));
  const stockItems = sorted.map((s) => ({ id: s.id, name: s.name }));
  const fieldDefinitions = db.stockFieldDefinitions ?? [];

  return (
    <div className="space-y-6">
      <Link href="/stocks" className="text-sm text-amber-700 hover:underline">
        ← Stocks
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventaire temps réel</h1>
          <p className="text-stone-500">Gestion complète des produits · alertes seuil automatiques</p>
        </div>
        {suppliers.length > 0 && (
          <StockItemCreateForm suppliers={suppliers} fieldDefinitions={fieldDefinitions} />
        )}
      </div>

      {suppliers.length > 0 && (
        <DeliveryNoteImportPanel suppliers={suppliers} stockItems={stockItems} />
      )}

      {db.suppliers.length === 0 ? (
        <EmptyState
          title="Aucun fournisseur enregistré"
          description="Ajoutez d'abord un fournisseur avant de créer des produits en stock."
          actionLabel="Ajouter un fournisseur"
          actionHref="/stocks/fournisseurs"
          buttonSize="sm"
        />
      ) : sorted.length === 0 ? (
        <>
          <EmptyState
            title="Inventaire vide"
            description="Ajoutez votre premier produit ou importez une fiche de livraison."
            actionLabel="Ajouter un produit"
            actionHref="/stocks/inventaire"
            buttonSize="sm"
          />
          <StockItemCreateForm suppliers={suppliers} fieldDefinitions={fieldDefinitions} />
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {sorted.map((item) => {
              const supplier = db.suppliers.find((s) => s.id === item.supplierId);
              return (
                <InventaireStockCard
                  key={item.id}
                  item={item}
                  supplierName={supplier?.name}
                  suppliers={suppliers}
                  fieldDefinitions={fieldDefinitions}
                  low={item.quantity <= item.minThreshold}
                />
              );
            })}
          </div>
          <div className="card-surface hidden overflow-x-auto p-4 lg:block">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b text-left text-stone-500">
                  <th className="min-w-[150px] pb-2">Produit</th>
                  <th className="pb-2">Quantité</th>
                  <th className="pb-2">Seuil</th>
                  <th className="pb-2">Péremption</th>
                  <th className="pb-2">Prix/u</th>
                  {fieldDefinitions.map((f) => (
                    <th key={f.id} className="pb-2">
                      {f.label}
                    </th>
                  ))}
                  <th className="pb-2">Statut</th>
                  <th className="pb-2">Ajuster</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => {
                  const low = item.quantity <= item.minThreshold;
                  const supplier = db.suppliers.find((s) => s.id === item.supplierId);
                  return (
                    <InventaireStockRow
                      key={item.id}
                      item={item}
                      supplierName={supplier?.name}
                      suppliers={suppliers}
                      fieldDefinitions={fieldDefinitions}
                      low={low}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
