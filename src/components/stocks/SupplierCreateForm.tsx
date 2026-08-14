"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function SupplierCreateForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", phone: "", email: "", deliveryDays: "2", notes: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, deliveryDays: Number(form.deliveryDays) }),
    });
    window.location.reload();
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>Ajouter un fournisseur</Button>;

  return (
    <Card title="Nouveau fournisseur">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input required placeholder="Nom" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded-lg border px-3 py-2 sm:col-span-2" />
        <input placeholder="Contact commandes / livraisons" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="rounded-lg border px-3 py-2 sm:col-span-2" />
        <input type="number" min={1} placeholder="Délai livraison (jours)" value={form.deliveryDays} onChange={(e) => setForm((f) => ({ ...f, deliveryDays: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <input placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="rounded-lg border px-3 py-2" />
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" size="sm" disabled={loading}>Enregistrer</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
        </div>
      </form>
    </Card>
  );
}
