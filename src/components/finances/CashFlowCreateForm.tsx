"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function CashFlowCreateForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "income" as "income" | "expense",
    category: "",
    amount: "",
    description: "",
    isFixed: false,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/cash-flow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    window.location.reload();
  }

  if (!open) return <Button size="lg" onClick={() => setOpen(true)}>Ajouter un mouvement</Button>;

  return (
    <Card title="Nouveau mouvement de trésorerie">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "income" | "expense" }))} className="rounded-lg border px-3 py-2">
          <option value="income">Entrée</option>
          <option value="expense">Sortie</option>
        </select>
        <input required placeholder="Catégorie" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <input type="number" step="0.01" required placeholder="Montant €" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.isFixed} onChange={(e) => setForm((f) => ({ ...f, isFixed: e.target.checked }))} />
          Charge fixe
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={loading}>Enregistrer</Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
        </div>
      </form>
    </Card>
  );
}
