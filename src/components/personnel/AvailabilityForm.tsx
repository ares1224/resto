"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Availability } from "@/types";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function AvailabilityForm({ initial }: { initial: Availability[] }) {
  const [items, setItems] = useState(initial);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("22:00");
  const [available, setAvailable] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    if (editId) {
      await fetch("/api/availabilities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, dayOfWeek, startTime, endTime, available }),
      });
    } else {
      await fetch("/api/availabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayOfWeek, startTime, endTime, available }),
      });
    }
    window.location.reload();
  }

  async function remove(id: string) {
    await fetch(`/api/availabilities?id=${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function startEdit(a: Availability) {
    setEditId(a.id);
    setDayOfWeek(a.dayOfWeek);
    setStartTime(a.startTime);
    setEndTime(a.endTime);
    setAvailable(a.available);
  }

  return (
    <div className="space-y-4">
      <Card title="Mes disponibilités">
        {items.length === 0 ? (
          <p className="text-sm font-medium text-amber-800">Aucune disponibilité déclarée.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 p-3 text-sm">
                <div>
                  <span className="font-bold">{DAYS[a.dayOfWeek - 1]}</span> · {a.startTime} — {a.endTime}
                  <span className="ml-2 inline-block">
                  <Badge variant={a.available ? "success" : "danger"}>
                    {a.available ? "Disponible" : "Indisponible"}
                  </Badge>
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="soft" onClick={() => startEdit(a)}>Modifier</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(a.id)}>Supprimer</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={editId ? "Modifier" : "Ajouter une disponibilité"}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="rounded-lg border px-3 py-3">
            {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
          </select>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-lg border px-3 py-3" />
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded-lg border px-3 py-3" />
          <select value={available ? "yes" : "no"} onChange={(e) => setAvailable(e.target.value === "yes")} className="rounded-lg border px-3 py-3">
            <option value="yes">Disponible</option>
            <option value="no">Indisponible</option>
          </select>
          <Button size="lg" onClick={save} disabled={loading}>{editId ? "Enregistrer" : "Ajouter"}</Button>
        </div>
        {editId && (
          <Button className="mt-2" variant="ghost" onClick={() => { setEditId(null); setAvailable(true); }}>
            Annuler modification
          </Button>
        )}
      </Card>
    </div>
  );
}

export function AvailabilityListAll({
  items,
  employees,
}: {
  items: Availability[];
  employees: { id: string; firstName: string; lastName: string }[];
}) {
  return (
    <Card title="Disponibilités équipe (arbitrage planning)">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2">Employé</th>
              <th className="pb-2">Jour</th>
              <th className="pb-2">Créneau</th>
              <th className="pb-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const emp = employees.find((e) => e.id === a.employeeId);
              return (
                <tr key={a.id} className="border-b border-amber-50">
                  <td className="py-2">{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</td>
                  <td className="py-2">{DAYS[a.dayOfWeek - 1]}</td>
                  <td className="py-2">{a.startTime} — {a.endTime}</td>
                  <td className="py-2">
                    <Badge variant={a.available ? "success" : "danger"}>{a.available ? "Dispo" : "Indispo"}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
