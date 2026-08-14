"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ShoppingListCreateForm } from "@/components/stocks/ShoppingListCreateForm";
import { ShoppingListRow } from "@/components/stocks/ShoppingListRow";
import type { ShoppingListItem } from "@/types";

type StockOption = { id: string; name: string; supplierId: string; unit: string };
type SupplierOption = { id: string; name: string };

export function ShoppingListClient({
  items,
  stockItems,
  suppliers,
}: {
  items: ShoppingListItem[];
  stockItems: StockOption[];
  suppliers: SupplierOption[];
}) {
  const [list, setList] = useState(items);
  const [loading, setLoading] = useState<string | null>(null);

  const stockNames = Object.fromEntries(stockItems.map((s) => [s.id, s.name]));
  const supplierNames = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));

  function displayName(item: ShoppingListItem): string {
    if (item.customName) return item.customName;
    if (item.stockItemId) return stockNames[item.stockItemId] ?? item.stockItemId;
    return "Article";
  }

  function supplierForItem(item: ShoppingListItem): string | undefined {
    const id =
      item.supplierId ??
      (item.stockItemId ? stockItems.find((s) => s.id === item.stockItemId)?.supplierId : undefined);
    return id ? supplierNames[id] : undefined;
  }

  async function toggleOrdered(id: string, ordered: boolean) {
    setLoading(id);
    await fetch("/api/shopping-list", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ordered }),
    });
    setList((prev) => prev.map((i) => (i.id === id ? { ...i, ordered } : i)));
    setLoading(null);
  }

  const pending = list.filter((i) => !i.ordered);

  return (
    <div className="space-y-6">
      <Link href="/stocks" className="text-sm text-amber-700 hover:underline">
        ← Stocks
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Liste de courses</h1>
          <p className="text-stone-500">
            Générée automatiquement selon seuils et péremption · modifiable librement
          </p>
        </div>
        {suppliers.length > 0 && (
          <ShoppingListCreateForm stockItems={stockItems} suppliers={suppliers} />
        )}
      </div>
      <Card title={`${pending.length} article(s) à commander`}>
        {list.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-stone-500">
              {stockItems.length === 0
                ? "Ajoutez des produits en inventaire ou un article manuellement."
                : "Rien à commander pour l'instant — ajoutez un article si besoin."}
            </p>
            {suppliers.length > 0 && (
              <ShoppingListCreateForm stockItems={stockItems} suppliers={suppliers} />
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((item) => (
              <ShoppingListRow
                key={item.id}
                item={item}
                displayName={displayName(item)}
                supplierName={supplierForItem(item)}
                stockItems={stockItems}
                suppliers={suppliers}
                onOrderedToggle={toggleOrdered}
                ordering={loading === item.id}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
