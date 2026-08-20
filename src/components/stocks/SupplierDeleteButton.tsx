"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toPublicError } from "@/lib/public-error";

export function SupplierDeleteButton({
  supplierId,
  supplierName,
  inline = false,
}: {
  supplierId: string;
  supplierName: string;
  inline?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/suppliers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: supplierId }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(toPublicError(data.error, "Impossible de supprimer"));
      return;
    }
    window.location.reload();
  }

  if (!confirm) {
    return (
      <Button size="xs" variant="danger" onClick={() => setConfirm(true)}>
        Supprimer
      </Button>
    );
  }

  if (inline) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-xs text-stone-600">« {supplierName} » ?</span>
        {error && <span className="text-xs text-red-600">{error}</span>}
        <Button size="xs" onClick={remove} disabled={loading}>
          Confirmer
        </Button>
        <Button size="xs" variant="secondary" onClick={() => setConfirm(false)}>
          Annuler
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-stone-600">Supprimer « {supplierName} » ?</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-1">
        <Button size="xs" onClick={remove} disabled={loading}>
          Confirmer
        </Button>
        <Button size="xs" variant="secondary" onClick={() => setConfirm(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
