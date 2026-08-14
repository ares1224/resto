import type { ShiftSlot, TimeEntry } from "@/types";

export function dateFromWeekDay(weekStart: string, dayOfWeek: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return d.toISOString().split("T")[0];
}

export function comparePunctuality(
  planned: string,
  actual: string
): "on_time" | "early" | "late" {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const diff = toMin(actual) - toMin(planned);
  if (Math.abs(diff) <= 5) return "on_time";
  return diff < 0 ? "early" : "late";
}

export function plannedTimesForEmployee(
  shiftSlots: ShiftSlot[],
  employeeId: string,
  date: string
): { start: string; end: string } | null {
  for (const slot of shiftSlots) {
    const slotDate = dateFromWeekDay(slot.weekStart, slot.dayOfWeek);
    if (slot.employeeId === employeeId && slotDate === date) {
      return { start: slot.startTime, end: slot.endTime };
    }
  }
  return null;
}

export function upsertTimeEntry(
  entries: TimeEntry[],
  entry: TimeEntry
): TimeEntry[] {
  const idx = entries.findIndex(
    (e) => e.employeeId === entry.employeeId && e.date === entry.date
  );
  if (idx >= 0) {
    const next = [...entries];
    next[idx] = { ...next[idx], ...entry };
    return next;
  }
  return [entry, ...entries];
}

export const PUNCTUALITY_LABELS = {
  on_time: "À l'heure",
  early: "En avance",
  late: "En retard",
};
