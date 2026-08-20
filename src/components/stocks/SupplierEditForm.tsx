"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Supplier } from "@/types";
import { toPublicError } from "@/lib/public-error";

type Props = {
  supplier: Supplier;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function SupplierEditForm({
  supplier,
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
    name: supplier.name,
    contact: supplier.contact,
    phone: supplier.phone,
    email: supplier.email,
    deliveryDays: String(supplier.deliveryDays),
    reliabilityScore: String(supplier.reliabilityScore),
    notes: supplier.notes,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/suppliers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: supplier.id,
        ...form,
        deliveryDays: Number(form.deliveryDays),
        reliabilityScore: Number(form.reliabilityScore),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(toPublicError(data.error, "Erreur lors de la modification"));
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
    <Card title={`Modifier — ${supplier.name}`}>
      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
        <input
          required
          placeholder="Nom"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="rounded-lg border px-3 py-2 sm:col-span-2"
        />
        <input
          placeholder="Contact commandes / livraisons"
          value={form.contact}
          onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
          className="rounded-lg border px-3 py-2"
        />
        <input
          placeholder="Téléphone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="rounded-lg border px-3 py-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="rounded-lg border px-3 py-2 sm:col-span-2"
        />
        <input
          type="number"
          min={1}
          placeholder="Délai livraison (jours)"
          value={form.deliveryDays}
          onChange={(e) => setForm((f) => ({ ...f, deliveryDays: e.target.value }))}
          className="rounded-lg border px-3 py-2"
        />
        <input
          type="number"
          min={1}
          max={5}
          step="0.1"
          placeholder="Fiabilité /5"
          value={form.reliabilityScore}
          onChange={(e) => setForm((f) => ({ ...f, reliabilityScore: e.target.value }))}
          className="rounded-lg border px-3 py-2"
        />
        <input
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="rounded-lg border px-3 py-2 sm:col-span-2"
        />
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
