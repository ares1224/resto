"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type StockOption = { id: string; name: string; supplierId: string; unit: string };
type SupplierOption = { id: string; name: string };

export function ShoppingListCreateForm({
  stockItems,
  suppliers,
}: {
  stockItems: StockOption[];
  suppliers: SupplierOption[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"stock" | "custom">("stock");
  const [form, setForm] = useState({
    stockItemId: stockItems[0]?.id ?? "",
    customName: "",
    supplierId: suppliers[0]?.id ?? "",
    suggestedQty: "1",
    reason: "Ajout manuel",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockItemId: mode === "stock" ? form.stockItemId : undefined,
        customName: mode === "custom" ? form.customName : undefined,
        supplierId: form.supplierId,
        suggestedQty: Number(form.suggestedQty),
        reason: form.reason,
      }),
    });
    window.location.reload();
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Ajouter un article
      </Button>
    );
  }

  return (
    <Card title="Nouvel article">
      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
        <div className="flex gap-2 sm:col-span-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "stock" ? "primary" : "secondary"}
            onClick={() => setMode("stock")}
          >
            Produit inventaire
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "custom" ? "primary" : "secondary"}
            onClick={() => setMode("custom")}
          >
            Autre produit
          </Button>
        </div>
        {mode === "stock" ? (
          <select
            value={form.stockItemId}
            onChange={(e) => {
              const stock = stockItems.find((s) => s.id === e.target.value);
              setForm((f) => ({
                ...f,
                stockItemId: e.target.value,
                supplierId: stock?.supplierId ?? f.supplierId,
              }));
            }}
            className="rounded-lg border px-3 py-2 sm:col-span-2"
            required
          >
            <option value="">Choisir un produit…</option>
            {stockItems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            required
            placeholder="Nom du produit"
            value={form.customName}
            onChange={(e) => setForm((f) => ({ ...f, customName: e.target.value }))}
            className="rounded-lg border px-3 py-2 sm:col-span-2"
          />
        )}
        <select
          value={form.supplierId}
          onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
          className="rounded-lg border px-3 py-2 sm:col-span-2"
          required
        >
          <option value="">Fournisseur</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0.1}
          step="0.1"
          placeholder="Quantité"
          value={form.suggestedQty}
          onChange={(e) => setForm((f) => ({ ...f, suggestedQty: e.target.value }))}
          className="rounded-lg border px-3 py-2"
        />
        <input
          placeholder="Motif / note"
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          className="rounded-lg border px-3 py-2"
        />
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" size="sm" disabled={loading || !form.supplierId}>
            Enregistrer
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  );
}
