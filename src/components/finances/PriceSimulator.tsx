"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { MenuItem } from "@/types";

export function PriceSimulator({ items, costs }: { items: MenuItem[]; costs: Record<string, number> }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const [ingredientIncrease, setIngredientIncrease] = useState(10);
  const [newPrice, setNewPrice] = useState(items[0]?.price ?? 0);

  const item = items.find((m) => m.id === selectedId);
  const baseCost = costs[selectedId] ?? 0;

  const simulation = useMemo(() => {
    const newCost = baseCost * (1 + ingredientIncrease / 100);
    const currentMargin = item ? item.price - baseCost : 0;
    const newMarginAtSamePrice = item ? item.price - newCost : 0;
    const newMarginAtNewPrice = newPrice - newCost;
    const breakEvenPrice = newCost / (item && item.price > 0 ? 1 - baseCost / item.price : 0.7);
    return { newCost, currentMargin, newMarginAtSamePrice, newMarginAtNewPrice, breakEvenPrice };
  }, [baseCost, ingredientIncrease, item, newPrice]);

  return (
    <div className="space-y-6">
      <Link href="/finances" className="text-sm text-amber-700 hover:underline">← Finances</Link>
      <h1 className="text-2xl font-bold">Simulateur de prix</h1>
      <p className="text-stone-500">Impact d&apos;une hausse matière première sur la marge</p>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Plat</label>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                const m = items.find((i) => i.id === e.target.value);
                if (m) setNewPrice(m.price);
              }}
              className="w-full rounded-lg border border-stone-300 px-3 py-3"
            >
              {items.map((m) => (
                <option key={m.id} value={m.id}>{m.name} — {m.price} €</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Hausse matière (+{ingredientIncrease} %)</label>
            <input
              type="range"
              min="0"
              max="50"
              value={ingredientIncrease}
              onChange={(e) => setIngredientIncrease(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nouveau prix carte (€)</label>
            <input
              type="number"
              step="0.5"
              value={newPrice}
              onChange={(e) => setNewPrice(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-300 px-3 py-3"
            />
          </div>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Coût actuel"><p className="text-xl font-bold">{baseCost.toFixed(2)} €</p></Card>
        <Card title="Coût après hausse"><p className="text-xl font-bold text-red-700">{simulation.newCost.toFixed(2)} €</p></Card>
        <Card title="Marge (prix actuel)"><p className="text-xl font-bold">{simulation.newMarginAtSamePrice.toFixed(2)} €</p></Card>
        <Card title="Marge (nouveau prix)"><p className="text-xl font-bold text-green-700">{simulation.newMarginAtNewPrice.toFixed(2)} €</p></Card>
      </div>
      <Card title="Recommandation">
        <p className="text-sm">
          Pour conserver la marge actuelle ({simulation.currentMargin.toFixed(2)} €), viser un prix d&apos;environ{" "}
          <strong>{simulation.breakEvenPrice.toFixed(2)} €</strong> avec +{ingredientIncrease} % sur les ingrédients.
        </p>
      </Card>
    </div>
  );
}
