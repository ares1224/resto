"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Employee, ShiftSlot, Availability } from "@/types";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DND_CONTEXT_ID = "planning-week-dnd";

type Emp = Pick<Employee, "id" | "firstName" | "lastName" | "role" | "active">;

function ShiftCard({
  slot,
  employee,
  onEdit,
  onDelete,
  dragHandle,
}: {
  slot: ShiftSlot;
  employee?: Emp;
  onEdit: (slot: ShiftSlot) => void;
  onDelete: (id: string) => void;
  dragHandle?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-md border px-2 py-1 text-xs ${
        slot.isPeak ? "border-amber-400 bg-amber-50" : "border-stone-200 bg-white"
      }`}
    >
      {dragHandle ?? (
        <div>
          <div className="font-medium">{employee ? employee.firstName : "?"}</div>
          <div className="text-stone-600">
            {slot.startTime}-{slot.endTime}
            {slot.breakMinutes > 0 && ` (${slot.breakMinutes}min)`}
          </div>
        </div>
      )}
      <div className="mt-1 flex gap-1">
        <button type="button" onClick={() => onEdit(slot)} className="text-[10px] font-bold text-amber-800">✎</button>
        <button type="button" onClick={() => onDelete(slot.id)} className="text-[10px] font-bold text-red-700">✕</button>
      </div>
    </div>
  );
}

function DraggableShift({
  slot,
  employee,
  onEdit,
  onDelete,
}: {
  slot: ShiftSlot;
  employee?: Emp;
  onEdit: (slot: ShiftSlot) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: slot.id, data: slot });
  return (
    <div ref={setNodeRef} className={isDragging ? "opacity-50" : undefined}>
      <ShiftCard
        slot={slot}
        employee={employee}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandle={
          <div {...listeners} {...attributes} className="cursor-grab">
            <div className="font-medium">{employee ? employee.firstName : "?"}</div>
            <div className="text-stone-600">
              {slot.startTime}-{slot.endTime}
              {slot.breakMinutes > 0 && ` (${slot.breakMinutes}min)`}
            </div>
          </div>
        }
      />
    </div>
  );
}

function DayCell({
  dayIndex,
  slots,
  employees,
  weekStart,
  onEdit,
  onDelete,
}: {
  dayIndex: number;
  slots: ShiftSlot[];
  employees: Emp[];
  weekStart: string;
  onEdit: (slot: ShiftSlot) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
    data: { dayOfWeek: dayIndex + 1, weekStart },
  });
  const daySlots = slots.filter((s) => s.dayOfWeek === dayIndex + 1);

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[140px] rounded-lg border p-2 ${isOver ? "border-amber-400 bg-amber-50/50" : "border-stone-200 bg-stone-50"}`}
    >
      <div className="mb-2 text-xs font-bold text-amber-900">{DAYS[dayIndex]}</div>
      <div className="space-y-1">
        {daySlots.map((slot) => (
          <DraggableShift
            key={slot.id}
            slot={slot}
            employee={employees.find((e) => e.id === slot.employeeId)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function StaticDayCell({
  dayIndex,
  slots,
  employees,
  onEdit,
  onDelete,
}: {
  dayIndex: number;
  slots: ShiftSlot[];
  employees: Emp[];
  onEdit: (slot: ShiftSlot) => void;
  onDelete: (id: string) => void;
}) {
  const daySlots = slots.filter((s) => s.dayOfWeek === dayIndex + 1);

  return (
    <div className="min-h-[140px] rounded-lg border border-stone-200 bg-stone-50 p-2">
      <div className="mb-2 text-xs font-bold text-amber-900">{DAYS[dayIndex]}</div>
      <div className="space-y-1">
        {daySlots.map((slot) => (
          <ShiftCard
            key={slot.id}
            slot={slot}
            employee={employees.find((e) => e.id === slot.employeeId)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function PlanningWeekGrid({
  slots,
  employees,
  weekStart,
  onEdit,
  onDelete,
  activeId,
  setActiveId,
  onDragEnd,
}: {
  slots: ShiftSlot[];
  employees: Emp[];
  weekStart: string;
  onEdit: (slot: ShiftSlot) => void;
  onDelete: (id: string) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const activeSlot = activeId ? slots.find((s) => s.id === activeId) : null;

  return (
    <DndContext
      id={DND_CONTEXT_ID}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
        {DAYS.map((_, i) => (
          <DayCell
            key={i}
            dayIndex={i}
            slots={slots}
            employees={employees}
            weekStart={weekStart}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeSlot && (
          <DraggableShift
            slot={activeSlot}
            employee={employees.find((e) => e.id === activeSlot.employeeId)}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

const emptyForm = {
  employeeId: "",
  dayOfWeek: 1,
  startTime: "09:00",
  endTime: "17:00",
  breakMinutes: 0,
  isPeak: false,
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PlanningEditor({
  initialSlots,
  employees,
  availabilities,
  weekStart,
  previousWeekStart,
  publishedAt,
}: {
  initialSlots: ShiftSlot[];
  employees: Emp[];
  availabilities: Availability[];
  weekStart: string;
  previousWeekStart: string;
  publishedAt?: string;
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [dndReady, setDndReady] = useState(false);
  const [published, setPublished] = useState(publishedAt);

  useEffect(() => {
    setDndReady(true);
  }, []);

  const reload = () => window.location.reload();

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const slot = slots.find((s) => s.id === active.id);
    if (!slot) return;
    const overData = over.data.current as { dayOfWeek?: number } | undefined;
    if (overData?.dayOfWeek) {
      const updated = slots.map((s) =>
        s.id === slot.id ? { ...s, dayOfWeek: overData.dayOfWeek! } : s
      );
      setSlots(updated);
      await fetch("/api/shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: slot.id, dayOfWeek: overData.dayOfWeek }),
      });
    }
  }

  async function submitSlot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (editId) {
      await fetch("/api/shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, ...form, weekStart }),
      });
    } else {
      await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, weekStart }),
      });
    }
    setLoading(false);
    reload();
  }

  async function deleteSlot(id: string) {
    await fetch(`/api/shifts?id=${id}`, { method: "DELETE" });
    setSlots((s) => s.filter((x) => x.id !== id));
  }

  function startEdit(slot: ShiftSlot) {
    setEditId(slot.id);
    setForm({
      employeeId: slot.employeeId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      breakMinutes: slot.breakMinutes,
      isPeak: slot.isPeak,
    });
  }

  async function duplicateWeek() {
    setLoading(true);
    await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate_week", fromWeek: previousWeekStart, toWeek: weekStart }),
    });
    setLoading(false);
    reload();
  }

  async function publishWeek() {
    setLoading(true);
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish_week", weekStart }),
    });
    setLoading(false);
    if (!res.ok) {
      setMessage("La publication a échoué — réessayez.");
      return;
    }
    const data = (await res.json().catch(() => ({}))) as {
      notified?: number;
      publishedAt?: string;
    };
    setPublished(data.publishedAt ?? new Date().toISOString());
    setMessage(
      `Planning validé — ${data.notified ?? 0} employé(s) prévenu(s). Chacun voit désormais ses créneaux dans son espace.`
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={
          published ? "card-surface border-l-4 border-[#10B981] p-4" : "alert-block p-4"
        }
      >
        <p
          className={`text-[14px] font-bold ${
            published ? "text-[#047857]" : "text-[#B91C1C]"
          }`}
        >
          {published ? "Planning validé" : "Planning non validé"}
        </p>
        <p className={`text-[12px] ${published ? "text-[#6B7280]" : "text-[#DC2626]"}`}>
          {published
            ? `Validé le ${formatDateTime(published)}. Chaque employé voit ses créneaux dans son espace, et toute modification lui parvient aussitôt.`
            : "Les employés ne voient pas encore cette semaine. Validez le planning pour l'envoyer dans leur espace."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={duplicateWeek} disabled={loading} variant="secondary">
          Dupliquer semaine précédente
        </Button>
        <Button onClick={publishWeek} disabled={loading}>
          {published ? "Revalider le planning" : "Valider et publier le planning"}
        </Button>
      </div>
      {message && <p className="rounded-lg bg-green-100 p-3 text-sm font-semibold text-green-900">{message}</p>}
      {warnings.length > 0 && (
        <div className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
          <strong>Alertes légales :</strong>
          <ul className="mt-1 list-disc pl-4">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      <Card title={editId ? "Modifier un créneau" : "Ajouter un créneau"}>
        <form onSubmit={submitSlot} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            required
            value={form.employeeId}
            onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
            className="rounded-lg border border-stone-300 px-3 py-2"
          >
            <option value="">Employé</option>
            {employees.filter((e) => e.active).map((e) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
          <select value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))} className="rounded-lg border px-3 py-2">
            {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
          </select>
          <input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <input type="number" min={0} placeholder="Coupure (min)" value={form.breakMinutes} onChange={(e) => setForm((f) => ({ ...f, breakMinutes: Number(e.target.value) }))} className="rounded-lg border px-3 py-2" />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={form.isPeak} onChange={(e) => setForm((f) => ({ ...f, isPeak: e.target.checked }))} />
            Heure de pointe
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={loading}>{editId ? "Enregistrer" : "Ajouter"}</Button>
            {editId && <Button type="button" variant="secondary" onClick={() => { setEditId(null); setForm(emptyForm); }}>Annuler</Button>}
          </div>
        </form>
      </Card>

      {dndReady ? (
        <PlanningWeekGrid
          slots={slots}
          employees={employees}
          weekStart={weekStart}
          onEdit={startEdit}
          onDelete={deleteSlot}
          activeId={activeId}
          setActiveId={setActiveId}
          onDragEnd={handleDragEnd}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
          {DAYS.map((_, i) => (
            <StaticDayCell
              key={i}
              dayIndex={i}
              slots={slots}
              employees={employees}
              onEdit={startEdit}
              onDelete={deleteSlot}
            />
          ))}
        </div>
      )}

      <Card title="Disponibilités déclarées (aide à l'arbitrage)">
        <div className="overflow-x-auto text-sm">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Employé</th>
                <th className="pb-2">Jour</th>
                <th className="pb-2">Créneau</th>
                <th className="pb-2">Dispo</th>
              </tr>
            </thead>
            <tbody>
              {availabilities.map((a) => {
                const emp = employees.find((e) => e.id === a.employeeId);
                return (
                  <tr key={a.id} className="border-b border-amber-50">
                    <td className="py-1">{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</td>
                    <td className="py-1">{DAYS[a.dayOfWeek - 1]}</td>
                    <td className="py-1">{a.startTime} — {a.endTime}</td>
                    <td className="py-1"><Badge variant={a.available ? "success" : "danger"}>{a.available ? "Oui" : "Non"}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function EmployeePlanningView({
  slots,
  weekStart,
}: {
  slots: ShiftSlot[];
  weekStart: string;
}) {
  const jsDay = new Date().getDay();
  const todayDow = jsDay === 0 ? 7 : jsDay;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      {DAYS.map((day, i) => {
        const daySlots = slots.filter((s) => s.dayOfWeek === i + 1);
        const isToday = i + 1 === todayDow;
        return (
          <div
            key={day}
            className={`card-surface min-h-[110px] p-3 ${isToday ? "ring-2 ring-[#1B3AE8]" : ""}`}
          >
            <div
              className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.5px] ${
                isToday ? "text-[#1B3AE8]" : "text-[#6B7280]"
              }`}
            >
              {day}
              {isToday && " · Auj."}
            </div>
            {daySlots.length === 0 ? (
              <p className="text-[12px] text-[#9CA3AF]">Libre</p>
            ) : (
              daySlots.map((s) => (
                <div
                  key={s.id}
                  className={`mb-1.5 rounded-lg p-2 text-[12px] ${
                    isToday ? "bg-[#EEF2FF]" : "bg-[#F5F6FA]"
                  }`}
                >
                  <div className={`font-semibold ${isToday ? "text-[#1B3AE8]" : "text-[#1A1D23]"}`}>
                    {s.startTime} — {s.endTime}
                  </div>
                  {s.breakMinutes > 0 && (
                    <div className="text-[#6B7280]">Coupure {s.breakMinutes} min</div>
                  )}
                  {s.isPeak && (
                    <div className="mt-1">
                      <Badge variant="warning">Pointe</Badge>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
