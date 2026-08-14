"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ShiftSlot } from "@/types";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function UnavailabilityForm({ myShifts }: { myShifts: ShiftSlot[] }) {
  const [shiftSlotId, setShiftSlotId] = useState(myShifts[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/unavailability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftSlotId, reason }),
    });
    setLoading(false);
    setDone(true);
    setReason("");
  }

  if (myShifts.length === 0) {
    return (
      <Card title="Signaler une indisponibilité">
        <p className="text-sm font-medium text-amber-800">Aucun créneau planifié cette semaine.</p>
      </Card>
    );
  }

  return (
    <Card title="Signaler une indisponibilité">
      <p className="mb-3 text-sm text-amber-900">Signalez si vous ne pouvez pas honorer un créneau prévu.</p>
      <form onSubmit={submit} className="grid gap-3">
        <select
          value={shiftSlotId}
          onChange={(e) => setShiftSlotId(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-3"
          required
        >
          {myShifts.map((s) => (
            <option key={s.id} value={s.id}>
              {DAYS[s.dayOfWeek - 1]} · {s.startTime} — {s.endTime}
            </option>
          ))}
        </select>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Raison (maladie, imprévu personnel…)"
          className="min-h-[80px] rounded-lg border border-stone-300 px-3 py-3"
          required
        />
        <Button size="lg" type="submit" disabled={loading}>Envoyer le signalement</Button>
        {done && <p className="text-sm font-semibold text-green-800">Signalement transmis à l&apos;équipe.</p>}
      </form>
    </Card>
  );
}
