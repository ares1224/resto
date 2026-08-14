"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ReplacementOffer, ShiftSlot } from "@/types";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function ReplacementManager({
  shifts,
  employees,
  offers,
}: {
  shifts: ShiftSlot[];
  employees: { id: string; firstName: string; lastName: string }[];
  offers: ReplacementOffer[];
}) {
  const [shiftSlotId, setShiftSlotId] = useState(shifts[0]?.id ?? "");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);

  async function propose() {
    if (!shiftSlotId || !targetEmployeeId) return;
    setLoading(true);
    await fetch("/api/replacements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "propose", shiftSlotId, targetEmployeeId }),
    });
    setLoading(false);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <Card title="Proposer un remplacement ciblé">
        <div className="grid gap-3 sm:grid-cols-3">
          <select value={shiftSlotId} onChange={(e) => setShiftSlotId(e.target.value)} className="rounded-lg border px-3 py-3">
            {shifts.map((s) => {
              const emp = employees.find((e) => e.id === s.employeeId);
              return (
                <option key={s.id} value={s.id}>
                  {DAYS[s.dayOfWeek - 1]} {s.startTime}-{s.endTime} ({emp?.firstName})
                </option>
              );
            })}
          </select>
          <select value={targetEmployeeId} onChange={(e) => setTargetEmployeeId(e.target.value)} className="rounded-lg border px-3 py-3">
            <option value="">Employé cible</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
          <Button size="lg" onClick={propose} disabled={loading || !targetEmployeeId}>Envoyer la proposition</Button>
        </div>
      </Card>
      <Card title="Réponses reçues">
        <ul className="space-y-2">
          {offers.map((o) => {
            const target = employees.find((e) => e.id === o.targetEmployeeId);
            return (
              <li key={o.id} className="rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-sm">
                <span className="font-bold">{target?.firstName} {target?.lastName}</span>
                {" · "}{DAYS[o.dayOfWeek - 1]} {o.startTime}-{o.endTime} · {o.roleLabel}
                <Badge variant={o.status === "accepted" ? "success" : o.status === "declined" ? "danger" : "warning"}>
                  {o.status}
                </Badge>
                {o.respondedAt && <span className="ml-2 text-xs text-stone-600">{o.respondedAt.slice(0, 16)}</span>}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

export function ReplacementEmployee({ offers }: { offers: ReplacementOffer[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const pending = offers.filter((o) => o.status === "pending");

  async function respond(offerId: string, status: "accepted" | "declined") {
    setLoading(offerId);
    await fetch("/api/replacements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond", offerId, status }),
    });
    window.location.reload();
  }

  return (
    <Card title="Propositions de remplacement">
      {pending.length === 0 ? (
        <p className="text-sm font-medium text-amber-800">Aucune proposition en attente.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((o) => (
            <li key={o.id} className="rounded-xl border-2 border-amber-200 bg-white p-4">
              <p className="font-bold text-amber-950">{DAYS[o.dayOfWeek - 1]} · {o.startTime} — {o.endTime}</p>
              <p className="text-sm text-amber-900">Poste : {o.roleLabel} · Semaine du {o.weekStart}</p>
              <div className="mt-3 flex gap-2">
                <Button size="lg" onClick={() => respond(o.id, "accepted")} disabled={loading === o.id}>Accepter</Button>
                <Button size="lg" variant="secondary" onClick={() => respond(o.id, "declined")} disabled={loading === o.id}>Refuser</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
