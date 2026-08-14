import type { Database } from "@/types";

export function removeEmployeeFromDb(db: Database, employeeId: string): string | null {
  const index = db.employees.findIndex((e) => e.id === employeeId);
  if (index === -1) return null;

  const { firstName, lastName } = db.employees[index];
  const removedShiftIds = db.shiftSlots.filter((s) => s.employeeId === employeeId).map((s) => s.id);
  const removedUserIds = db.users.filter((u) => u.employeeId === employeeId).map((u) => u.id);

  db.employees.splice(index, 1);
  db.users = db.users.filter((u) => u.employeeId !== employeeId);
  db.availabilities = db.availabilities.filter((a) => a.employeeId !== employeeId);
  db.shiftSlots = db.shiftSlots.filter((s) => s.employeeId !== employeeId);
  db.absences = db.absences.filter((a) => a.employeeId !== employeeId);
  db.shiftUnavailabilities = db.shiftUnavailabilities.filter((u) => u.employeeId !== employeeId);
  db.qrClockTokens = db.qrClockTokens.filter((t) => t.employeeId !== employeeId);
  db.timeEntries = db.timeEntries.filter((t) => t.employeeId !== employeeId);
  db.replacementOffers = db.replacementOffers.filter(
    (o) => o.targetEmployeeId !== employeeId && !removedShiftIds.includes(o.shiftSlotId)
  );
  db.notifications = db.notifications.filter(
    (n) => !n.targetUserId || !removedUserIds.includes(n.targetUserId)
  );

  return `${firstName} ${lastName}`;
}
