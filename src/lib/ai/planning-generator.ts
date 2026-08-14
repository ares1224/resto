import type { Database } from "@/types";
import type { PlanningProposal, PlanningProposalSlot } from "@/types/ai";
import { computeWeeklyHours } from "@/lib/business";
import { generateTrafficForecast, expectedCoversForPeak } from "./traffic-forecast";

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function shiftDurationHours(start: string, end: string, breakMin: number): number {
  return (parseTime(end) - parseTime(start)) / 60 - breakMin / 60;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function isKitchenRole(role: string): boolean {
  const r = role.toLowerCase();
  return r.includes("cuisine") || r.includes("chef") || r.includes("commis") || r.includes("plonge");
}

function isServiceRole(role: string): boolean {
  const r = role.toLowerCase();
  return r.includes("serveur") || r.includes("serveuse") || r.includes("manager") || r.includes("salle");
}

function peakNeedsKitchen(peakStart: string): boolean {
  return parseTime(peakStart) < parseTime("16:00");
}

function dateFromWeekDay(weekStart: string, dayOfWeek: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return d.toISOString().split("T")[0];
}

function hasMinRest(
  db: Database,
  employeeId: string,
  proposed: PlanningProposalSlot[],
  dayOfWeek: number,
  startTime: string
): boolean {
  const minRest = db.settings.minRestHours;
  const prevDay = dayOfWeek === 1 ? 7 : dayOfWeek - 1;

  const prevShifts = proposed.filter(
    (s) => s.employeeId === employeeId && s.dayOfWeek === prevDay
  );
  for (const prev of prevShifts) {
    const restHours = (24 * 60 - parseTime(prev.endTime) + parseTime(startTime)) / 60;
    if (restHours < minRest) return false;
  }
  return true;
}

function isAvailable(
  db: Database,
  employeeId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
): boolean {
  const avails = db.availabilities.filter((a) => a.employeeId === employeeId && a.dayOfWeek === dayOfWeek);
  if (avails.length === 0) return true;
  return avails.some(
    (a) => a.available && overlaps(a.startTime, a.endTime, startTime, endTime)
  );
}

function wouldExceedHours(
  db: Database,
  employeeId: string,
  weekStart: string,
  proposed: PlanningProposalSlot[],
  newHours: number
): boolean {
  const existing = computeWeeklyHours(
    { ...db, shiftSlots: proposed.map((p) => ({ ...p, id: p.tempId, weekStart })) },
    employeeId,
    weekStart
  );
  const employee = db.employees.find((e) => e.id === employeeId);
  const max = Math.min(employee?.weeklyMaxHours ?? 48, db.settings.maxWeeklyHours);
  return existing + newHours > max;
}

export function generatePlanningProposal(db: Database, weekStart: string): PlanningProposal {
  const forecast = generateTrafficForecast(db, weekStart, 7);
  const employees = db.employees.filter(
    (e) => e.active && e.hourlyRate > 0 && !e.role.toLowerCase().includes("gérant")
  );
  const proposed: PlanningProposalSlot[] = [];
  const warnings: string[] = [];
  const staffNeeds: PlanningProposal["staffNeeds"] = [];
  const assignedCount: Record<string, number> = {};

  for (const peak of db.settings.peakSlots) {
    const date = dateFromWeekDay(weekStart, peak.dayOfWeek);
    const expectedCovers = expectedCoversForPeak(db, date, peak.start, peak.end, forecast);
    const seatCapacity = Math.max(db.settings.covers, 1);
    const coversPerStaff = Math.max(3, Math.ceil(seatCapacity / Math.max(peak.minStaff, 1)));
    const required = Math.max(peak.minStaff, Math.ceil(expectedCovers / coversPerStaff));
    let assigned = 0;

    const needKitchen = peakNeedsKitchen(peak.start);
    const candidates = employees
      .filter((e) => {
        if (needKitchen && !isKitchenRole(e.role) && !isServiceRole(e.role)) return false;
        if (!needKitchen && isKitchenRole(e.role) && !isServiceRole(e.role)) return false;
        return isAvailable(db, e.id, peak.dayOfWeek, peak.start, peak.end);
      })
      .sort((a, b) => (assignedCount[a.id] ?? 0) - (assignedCount[b.id] ?? 0));

    for (const emp of candidates) {
      if (assigned >= required) break;
      const breakMinutes = shiftDurationHours(peak.start, peak.end, 0) > 6 ? 30 : 0;
      const hours = shiftDurationHours(peak.start, peak.end, breakMinutes);

      if (!hasMinRest(db, emp.id, proposed, peak.dayOfWeek, peak.start)) {
        warnings.push(`${emp.firstName} : repos < ${db.settings.minRestHours}h avant ${peak.start} (J${peak.dayOfWeek})`);
        continue;
      }
      if (wouldExceedHours(db, emp.id, weekStart, proposed, hours)) continue;

      const already = proposed.some(
        (p) =>
          p.employeeId === emp.id &&
          p.dayOfWeek === peak.dayOfWeek &&
          overlaps(p.startTime, p.endTime, peak.start, peak.end)
      );
      if (already) continue;

      proposed.push({
        tempId: crypto.randomUUID(),
        employeeId: emp.id,
        dayOfWeek: peak.dayOfWeek,
        startTime: peak.start,
        endTime: peak.end,
        breakMinutes,
        isPeak: true,
        weekStart,
        rationale: `Fréquentation estimée ${expectedCovers} couverts → besoin ${required} staff · ${emp.role}`,
      });
      assignedCount[emp.id] = (assignedCount[emp.id] ?? 0) + 1;
      assigned++;
    }

    staffNeeds.push({
      dayOfWeek: peak.dayOfWeek,
      peakLabel: `${peak.start}-${peak.end}`,
      required,
      assigned,
    });

    if (assigned < required) {
      warnings.push(
        `J${peak.dayOfWeek} ${peak.start}-${peak.end} : ${assigned}/${required} staff assignés (disponibilités ou contraintes légales)`
      );
    }
  }

  for (const emp of employees.filter((e) => isKitchenRole(e.role))) {
    for (let dow = 1; dow <= 5; dow++) {
      const prepStart = "08:00";
      const prepEnd = "11:00";
      if (!isAvailable(db, emp.id, dow, prepStart, prepEnd)) continue;
      const exists = proposed.some(
        (p) => p.employeeId === emp.id && p.dayOfWeek === dow && overlaps(p.startTime, p.endTime, prepStart, prepEnd)
      );
      if (exists) continue;
      const hours = shiftDurationHours(prepStart, prepEnd, 0);
      if (wouldExceedHours(db, emp.id, weekStart, proposed, hours)) continue;

      proposed.push({
        tempId: crypto.randomUUID(),
        employeeId: emp.id,
        dayOfWeek: dow,
        startTime: prepStart,
        endTime: prepEnd,
        breakMinutes: 0,
        isPeak: false,
        weekStart,
        rationale: `Préparation cuisine · ${emp.role}`,
      });
    }
  }

  for (const emp of employees) {
    const hours = computeWeeklyHours(
      { ...db, shiftSlots: proposed.map((p) => ({ ...p, id: p.tempId, weekStart })) },
      emp.id,
      weekStart
    );
    if (hours > emp.weeklyMaxHours) {
      warnings.push(`${emp.firstName} : ${hours.toFixed(1)}h planifiées (max contrat ${emp.weeklyMaxHours}h)`);
    }
  }

  const uniqueWarnings = [...new Set(warnings)];
  const summary = `${proposed.length} créneau(x) proposé(s) pour la semaine du ${weekStart}, basé sur fréquentation estimée et disponibilités déclarées.`;

  return {
    weekStart,
    slots: proposed,
    warnings: uniqueWarnings,
    summary,
    staffNeeds,
  };
}

export function proposalToShiftSlots(
  proposal: PlanningProposal
): { id: string; employeeId: string; dayOfWeek: number; startTime: string; endTime: string; breakMinutes: number; isPeak: boolean; weekStart: string }[] {
  return proposal.slots.map((s) => ({
    id: crypto.randomUUID(),
    employeeId: s.employeeId,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    breakMinutes: s.breakMinutes,
    isPeak: s.isPeak,
    weekStart: s.weekStart,
  }));
}
