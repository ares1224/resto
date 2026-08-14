"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ManagerPermissions } from "@/types";

const LABELS: { key: keyof ManagerPermissions; label: string }[] = [
  { key: "planning", label: "Planning équipe" },
  { key: "stocks", label: "Stocks & fournisseurs" },
  { key: "foodCost", label: "Food cost par plat" },
  { key: "clientele", label: "Réservations" },
  { key: "hygiene", label: "Hygiène HACCP" },
  { key: "operations", label: "Opérationnel & carte" },
  { key: "marketing", label: "Marketing" },
];

export function ManagerPermissionsForm({ initial }: { initial: ManagerPermissions }) {
  const [perms, setPerms] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerPermissions: perms }),
    });
    setLoading(false);
    setSaved(true);
    window.location.reload();
  }

  return (
    <Card title="Droits du manager">
      <p className="mb-4 text-sm font-medium text-amber-900">
        Choisissez les modules activés pour le compte manager.
      </p>
      <div className="space-y-3">
        {LABELS.map(({ key, label }) => (
          <label key={key} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-2">
            <input
              type="checkbox"
              checked={perms[key]}
              onChange={(e) => setPerms((p) => ({ ...p, [key]: e.target.checked }))}
              className="h-5 w-5 accent-orange-600"
            />
            <span className="font-semibold text-amber-950">{label}</span>
          </label>
        ))}
      </div>
      <Button size="lg" className="mt-6" onClick={save} disabled={loading}>
        {loading ? "Enregistrement…" : "Enregistrer les droits"}
      </Button>
      {saved && <p className="mt-2 text-sm font-semibold text-green-800">Droits mis à jour</p>}
    </Card>
  );
}
