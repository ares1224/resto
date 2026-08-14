"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type FieldDef = { id: string; key: string; label: string };

export function StockItemCreateForm({
  suppliers,
  fieldDefinitions = [],
}: {
  suppliers: { id: string; name: string }[];
  fieldDefinitions?: FieldDef[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "kg",
    quantity: "0",
    minThreshold: "1",
    supplierId: suppliers[0]?.id ?? "",
    unitPrice: "",
    expiryDate: "",
    customFields: {} as Record<string, string>,
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
    await fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        ...form,
        quantity: Number(form.quantity),
        minThreshold: Number(form.minThreshold),
        unitPrice: Number(form.unitPrice),
        expiryDate: form.expiryDate || undefined,
        customFields: form.customFields,
      }),
    });
    window.location.reload();
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>Ajouter un produit</Button>;

  return (
    <Card title="Nouveau produit en stock">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input required placeholder="Nom du produit" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded-lg border px-3 py-2 sm:col-span-2" />
        <input placeholder="Catégorie" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <input placeholder="Unité (kg, L, pièce…)" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <select value={form.supplierId} onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))} className="rounded-lg border px-3 py-2 sm:col-span-2" required>
          <option value="">Fournisseur</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="number" step="0.01" placeholder="Quantité" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <input type="number" step="0.01" placeholder="Seuil minimum" value={form.minThreshold} onChange={(e) => setForm((f) => ({ ...f, minThreshold: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <input type="number" step="0.01" required placeholder="Prix unitaire €" value={form.unitPrice} onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <input type="date" placeholder="Péremption" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} className="rounded-lg border px-3 py-2" />
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
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" size="sm" disabled={loading || !form.supplierId}>Enregistrer</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
        </div>
      </form>
    </Card>
  );
}
