"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { HaccpCheck } from "@/types";

export function HaccpChecklist({ checks, employees }: { checks: HaccpCheck[]; employees: Record<string, string> }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [value, setValue] = useState<Record<string, string>>({});

  async function complete(id: string) {
    setLoading(id);
    await fetch("/api/haccp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkId: id, value: value[id] }),
    });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <Link href="/hygiene" className="text-sm text-amber-700 hover:underline">← Hygiène</Link>
      <h1 className="text-2xl font-bold">Checklists HACCP</h1>
      <div className="space-y-3">
        {checks.map((check) => (
          <Card key={check.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge variant="default">{check.type}</Badge>
                <p className="mt-1 font-medium">{check.label}</p>
                {check.completed && (
                  <p className="text-xs text-stone-500">
                    ✓ {check.completedAt?.slice(0, 16)} — {employees[check.completedBy ?? ""] ?? check.completedBy}
                    {check.value && ` · ${check.value}`}
                  </p>
                )}
              </div>
              {!check.completed && (
                <div className="flex gap-2">
                  {check.type === "temperature" && (
                    <input
                      placeholder="Ex: 3°C"
                      value={value[check.id] ?? ""}
                      onChange={(e) => setValue((v) => ({ ...v, [check.id]: e.target.value }))}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  )}
                  <Button size="lg" onClick={() => complete(check.id)} disabled={loading === check.id}>
                    Valider
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
