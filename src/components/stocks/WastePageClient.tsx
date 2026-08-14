"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { computeWasteTotal } from "@/lib/business";
import type { Database } from "@/types";

export function WastePageClient({ db }: { db: Database }) {
  const waste = computeWasteTotal(db);
  const [loading, setLoading] = useState(false);
  const [stockItemId, setStockItemId] = useState(db.stockItems[0]?.id ?? "");
  const [quantity, setQuantity] = useState(0.5);
  const [reason, setReason] = useState("");

  async function addWaste() {
    setLoading(true);
    await fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "waste", stockItemId, quantity, reason }),
    });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <Link href="/stocks" className="text-sm text-amber-700 hover:underline">← Stocks</Link>
      <h1 className="text-2xl font-bold">Gaspillage</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="30 derniers jours">
          <p className="text-3xl font-bold text-red-700">{waste.value.toFixed(2)} €</p>
          <p className="text-sm text-stone-500">{waste.quantity.toFixed(1)} unités jetées</p>
        </Card>
      </div>
      <Card title="Enregistrer un gaspillage">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={stockItemId} onChange={(e) => setStockItemId(e.target.value)} className="rounded-lg border border-stone-300 px-3 py-3">
            {db.stockItems.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input type="number" step="0.1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="rounded-lg border border-stone-300 px-3 py-3" placeholder="Quantité" />
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-stone-300 px-3 py-3" placeholder="Motif" />
          <Button size="lg" onClick={addWaste} disabled={loading}>Enregistrer</Button>
        </div>
      </Card>
      <Card title="Historique">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-stone-500">
                <th className="pb-2">Date</th>
                <th className="pb-2">Produit</th>
                <th className="pb-2">Qté</th>
                <th className="pb-2">Valeur</th>
                <th className="pb-2">Motif</th>
              </tr>
            </thead>
            <tbody>
              {db.wasteEntries.map((w) => {
                const item = db.stockItems.find((s) => s.id === w.stockItemId);
                return (
                  <tr key={w.id} className="border-b border-stone-50">
                    <td className="py-2">{w.date}</td>
                    <td className="py-2">{item?.name}</td>
                    <td className="py-2">{w.quantity}</td>
                    <td className="py-2">{w.value.toFixed(2)} €</td>
                    <td className="py-2">{w.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
