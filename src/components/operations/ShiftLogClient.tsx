"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ShiftLog } from "@/types";

export function ShiftLogClient({ logs, authors }: { logs: ShiftLog[]; authors: Record<string, string> }) {
  const [shift, setShift] = useState<"midi" | "soir">("soir");
  const [incidents, setIncidents] = useState("");
  const [handover, setHandover] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await fetch("/api/shift-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift, incidents, handoverNotes: handover }),
    });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <Link href="/operations" className="text-sm text-amber-700 hover:underline">← Opérationnel</Link>
      <h1 className="text-2xl font-bold">Main courante</h1>
      <Card title="Nouvelle entrée de passation">
        <div className="grid gap-3">
          <select value={shift} onChange={(e) => setShift(e.target.value as "midi" | "soir")} className="rounded-lg border border-stone-300 px-3 py-3">
            <option value="midi">Service midi</option>
            <option value="soir">Service soir</option>
          </select>
          <textarea placeholder="Incidents du service" value={incidents} onChange={(e) => setIncidents(e.target.value)} className="rounded-lg border border-stone-300 px-3 py-3" rows={2} />
          <textarea placeholder="Notes de passation à l'équipe suivante" value={handover} onChange={(e) => setHandover(e.target.value)} className="rounded-lg border border-stone-300 px-3 py-3" rows={3} />
          <Button size="lg" onClick={submit} disabled={loading}>Enregistrer</Button>
        </div>
      </Card>
      <Card title="Historique">
        {logs.map((log) => (
          <div key={log.id} className="mb-4 border-b border-stone-50 pb-4 last:border-0">
            <p className="text-sm font-medium">{log.date} · Service {log.shift} — {authors[log.authorId] ?? log.authorId}</p>
            {log.incidents && <p className="text-sm text-red-700">Incidents : {log.incidents}</p>}
            <p className="text-sm text-stone-600">Passation : {log.handoverNotes}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}
