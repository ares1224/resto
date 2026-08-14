"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ShoppingListItem } from "@/types";

type StockOption = { id: string; name: string; supplierId: string; unit: string };
type SupplierOption = { id: string; name: string };

type Props = {
  item: ShoppingListItem;
  displayName: string;
  supplierName?: string;
  stockItems: StockOption[];
  suppliers: SupplierOption[];
  onOrderedToggle: (id: string, ordered: boolean) => void;
  ordering: boolean;
};

export function ShoppingListRow({
  item,
  displayName,
  supplierName,
  stockItems,
  suppliers,
  onOrderedToggle,
  ordering,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    mode: item.stockItemId ? ("stock" as const) : ("custom" as const),
    stockItemId: item.stockItemId ?? "",
    customName: item.customName ?? displayName,
    supplierId: item.supplierId ?? stockItems.find((s) => s.id === item.stockItemId)?.supplierId ?? "",
    suggestedQty: String(item.suggestedQty),
    reason: item.reason,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/shopping-list", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id: item.id,
        stockItemId: form.mode === "stock" ? form.stockItemId : null,
        customName: form.mode === "custom" ? form.customName : null,
        supplierId: form.supplierId,
        suggestedQty: Number(form.suggestedQty),
        reason: form.reason,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Erreur lors de la modification");
      return;
    }
    window.location.reload();
  }

  async function remove() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/shopping-list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Impossible de supprimer");
      return;
    }
    window.location.reload();
  }

  return (
    <li
      className={`rounded-lg p-3 ${item.ordered ? "bg-green-50 opacity-70" : "bg-stone-50"}`}
    >
      {!editing ? (
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-medium leading-snug">{displayName}</p>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <Button size="xs" variant="soft" onClick={() => setEditing(true)}>
                  Modifier
                </Button>
                {!deleting ? (
                  <Button size="xs" variant="danger" onClick={() => setDeleting(true)}>
                    Supprimer
                  </Button>
                ) : (
                  <>
                    <Button size="xs" onClick={remove} disabled={loading}>
                      Confirmer
                    </Button>
                    <Button size="xs" variant="secondary" onClick={() => setDeleting(false)}>
                      Annuler
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-stone-500">
              Qté : {item.suggestedQty}
              {supplierName ? ` · ${supplierName}` : ""}
            </p>
            <p className="text-xs text-stone-400">{item.reason}</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <Button
            size="xs"
            variant={item.ordered ? "secondary" : "primary"}
            onClick={() => onOrderedToggle(item.id, !item.ordered)}
            disabled={ordering}
          >
            {item.ordered ? "Commandé ✓" : "Marquer commandé"}
          </Button>
        </div>
      ) : (
        <Card title={`Modifier — ${displayName}`}>
          <form onSubmit={save} className="grid gap-2 sm:grid-cols-2">
            <div className="flex gap-2 sm:col-span-2">
              <Button
                type="button"
                size="sm"
                variant={form.mode === "stock" ? "primary" : "secondary"}
                onClick={() => setForm((f) => ({ ...f, mode: "stock" }))}
              >
                Produit inventaire
              </Button>
              <Button
                type="button"
                size="sm"
                variant={form.mode === "custom" ? "primary" : "secondary"}
                onClick={() => setForm((f) => ({ ...f, mode: "custom" }))}
              >
                Autre produit
              </Button>
            </div>
            {form.mode === "stock" ? (
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
                {stockItems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                required
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
              value={form.suggestedQty}
              onChange={(e) => setForm((f) => ({ ...f, suggestedQty: e.target.value }))}
              className="rounded-lg border px-3 py-2"
            />
            <input
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="rounded-lg border px-3 py-2"
            />
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={loading}>
                Enregistrer
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      )}
    </li>
  );
}
