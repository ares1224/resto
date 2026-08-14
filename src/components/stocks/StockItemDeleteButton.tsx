"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function StockItemDeleteButton({
  itemId,
  itemName,
  inline = false,
}: {
  itemId: string;
  itemName: string;
  inline?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/stocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Impossible de supprimer");
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
        <span className="text-xs text-stone-600">« {itemName} » ?</span>
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
      <p className="text-xs text-stone-600">Supprimer « {itemName} » ?</p>
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
