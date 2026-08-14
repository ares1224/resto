"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function StockAdjustForm({ itemId, current }: { itemId: string; current: number }) {
  const [qty, setQty] = useState(current);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    await fetch("/api/stocks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity: qty }),
    });
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        step="0.1"
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        className="w-16 rounded border border-stone-300 px-1.5 py-0.5 text-xs"
      />
      <Button size="xs" onClick={save} disabled={loading}>OK</Button>
    </div>
  );
}
