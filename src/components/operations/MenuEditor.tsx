"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { MenuItemCreateForm } from "@/components/operations/MenuItemCreateForm";
import type { MenuItem } from "@/types";

export function MenuEditor({ items }: { items: MenuItem[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function toggle(id: string, field: "available" | "isDailySpecial", value: boolean) {
    setLoading(id);
    await fetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <Link href="/operations" className="text-sm text-amber-700 hover:underline">← Opérationnel</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Carte & menu</h1>
          <p className="text-stone-500">Ruptures masquées automatiquement si stock insuffisant</p>
        </div>
        <MenuItemCreateForm />
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="Aucun plat en carte"
          description="Ajoutez vos plats, entrées et desserts pour gérer la carte et le food cost."
          actionLabel="Ajouter un plat"
          actionHref="/operations/menu"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-stone-500">{item.category} · {item.price} €</p>
                  <p className="text-xs text-stone-400">{item.description || "—"}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant={item.available ? "success" : "danger"}>{item.available ? "Visible" : "Masqué (rupture)"}</Badge>
                    {item.isDailySpecial && <Badge variant="warning">Plat du jour</Badge>}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant={item.available ? "secondary" : "primary"} onClick={() => toggle(item.id, "available", !item.available)} disabled={loading === item.id}>
                    {item.available ? "Masquer" : "Afficher"}
                  </Button>
                  <Button size="sm" variant={item.isDailySpecial ? "secondary" : "primary"} onClick={() => toggle(item.id, "isDailySpecial", !item.isDailySpecial)} disabled={loading === item.id}>
                    {item.isDailySpecial ? "Retirer PdJ" : "Plat du jour"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
