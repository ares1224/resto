"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { StockFieldDefinition, StockItem } from "@/types";

type SupplierOption = { id: string; name: string };

type Props = {
  item: StockItem;
  suppliers: SupplierOption[];
  fieldDefinitions: StockFieldDefinition[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function StockItemEditForm({
  item,
  suppliers,
  fieldDefinitions,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantity: String(item.quantity),
    minThreshold: String(item.minThreshold),
    supplierId: item.supplierId,
    unitPrice: String(item.unitPrice),
    expiryDate: item.expiryDate ?? "",
    customFields: { ...(item.customFields ?? {}) } as Record<string, string>,
  });

  function setCustomField(key: string, value: string) {
    setForm((f) => ({
      ...f,
      customFields: { ...f.customFields, [key]: value },
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/stocks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id: item.id,
        name: form.name,
        category: form.category,
        unit: form.unit,
        quantity: Number(form.quantity),
        minThreshold: Number(form.minThreshold),
        supplierId: form.supplierId,
        unitPrice: Number(form.unitPrice),
        expiryDate: form.expiryDate || undefined,
        customFields: form.customFields,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur lors de la modification");
      return;
    }
    window.location.reload();
  }

  if (!open) {
    if (!showTrigger) return null;
    return (
      <Button size="xs" variant="soft" onClick={() => setOpen(true)}>
        Modifier
      </Button>
    );
  }

  return (
    <Card title={`Modifier — ${item.name}`} className="sm:min-w-[280px]">
      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
        <input
          required
          placeholder="Nom du produit"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="rounded-lg border px-3 py-2 sm:col-span-2"
        />
        <input
          placeholder="Catégorie"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          className="rounded-lg border px-3 py-2"
        />
        <input
          placeholder="Unité"
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          className="rounded-lg border px-3 py-2"
        />
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
          step="0.01"
          placeholder="Quantité"
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          className="rounded-lg border px-3 py-2"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Seuil minimum"
          value={form.minThreshold}
          onChange={(e) => setForm((f) => ({ ...f, minThreshold: e.target.value }))}
          className="rounded-lg border px-3 py-2"
        />
        <input
          type="number"
          step="0.01"
          required
          placeholder="Prix unitaire €"
          value={form.unitPrice}
          onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
          className="rounded-lg border px-3 py-2"
        />
        <input
          type="date"
          value={form.expiryDate}
          onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
          className="rounded-lg border px-3 py-2"
        />
        {fieldDefinitions.map((def) => (
          <label key={def.id} className="sm:col-span-2">
            <span className="mb-1 block text-xs text-stone-500">{def.label}</span>
            <input
              value={form.customFields[def.key] ?? ""}
              onChange={(e) => setCustomField(def.key, e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </label>
        ))}
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" size="sm" disabled={loading}>
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
