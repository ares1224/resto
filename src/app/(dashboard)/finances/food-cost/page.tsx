import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { computeFoodCost } from "@/lib/business";
import { requirePagePermission } from "@/lib/page-guard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function FoodCostPage() {
  await requirePagePermission("view_food_cost");
  const db = await getDb();

  return (
    <div className="space-y-6">
      <Link href="/finances" className="text-sm text-amber-700 hover:underline">← Finances</Link>
      <h1 className="text-2xl font-bold">Food cost par plat</h1>
      <p className="text-stone-500">Calculé depuis fiches recettes et prix d&apos;achat ingrédients</p>
      {db.menuItems.length === 0 ? (
        <EmptyState
          title="Aucun plat en carte"
          description="Ajoutez des plats à la carte pour calculer le food cost et les marges."
          actionLabel="Créer un plat"
          actionHref="/operations/menu"
        />
      ) : (
        <div className="card-surface overflow-x-auto p-4">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-stone-500">
                <th className="pb-2">Plat</th>
                <th className="pb-2">Catégorie</th>
                <th className="pb-2">Prix vente</th>
                <th className="pb-2">Coût matière</th>
                <th className="pb-2">Food cost %</th>
                <th className="pb-2">Marge brute</th>
              </tr>
            </thead>
            <tbody>
              {db.menuItems.map((item) => {
                const cost = computeFoodCost(db, item.id);
                const foodCostPct = item.price > 0 ? (cost / item.price) * 100 : 0;
                const margin = item.price - cost;
                const recipe = db.recipes.find((r) => r.menuItemId === item.id);
                return (
                  <tr key={item.id} className="border-b border-stone-50">
                    <td className="py-3">
                      <div className="font-medium">{item.name}</div>
                      {recipe && <div className="text-xs text-stone-500">{recipe.ingredients.length} ingrédient(s)</div>}
                    </td>
                    <td className="py-3">{item.category}</td>
                    <td className="py-3">{item.price.toFixed(2)} €</td>
                    <td className="py-3">{cost.toFixed(2)} €</td>
                    <td className="py-3">
                      <Badge variant={foodCostPct > 35 ? "danger" : foodCostPct > 30 ? "warning" : "success"}>
                        {foodCostPct.toFixed(1)} %
                      </Badge>
                    </td>
                    <td className="py-3">{margin.toFixed(2)} €</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
