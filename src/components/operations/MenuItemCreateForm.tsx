"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function MenuItemCreateForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Plats", price: "", description: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price) }),
    });
    window.location.reload();
  }

  if (!open) return <Button size="lg" onClick={() => setOpen(true)}>Ajouter un plat</Button>;

  return (
    <Card title="Nouveau plat / entrée carte">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input required placeholder="Nom" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded-lg border px-3 py-2 sm:col-span-2" />
        <input placeholder="Catégorie" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <input type="number" step="0.01" required placeholder="Prix €" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="min-h-[60px] rounded-lg border px-3 py-2 sm:col-span-2" />
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={loading}>Enregistrer</Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
        </div>
      </form>
    </Card>
  );
}
