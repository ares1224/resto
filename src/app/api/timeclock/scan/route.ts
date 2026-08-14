import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { getDb, updateDb } from "@/lib/db/store";
import { validateQrToken } from "@/lib/qr-token";
import {
  comparePunctuality,
  plannedTimesForEmployee,
  upsertTimeEntry,
} from "@/lib/timeclock";
import { logAudit } from "@/lib/audit";
import type { TimeEntry } from "@/types";

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["gerant", "manager"]);
    const { token, action } = await request.json();
    const db = await getDb();
    const qr = validateQrToken(db, token);
    if (!qr) {
      return NextResponse.json({ error: "QR expiré ou invalide" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toTimeString().slice(0, 5);
    const planned = plannedTimesForEmployee(db.shiftSlots, qr.employeeId, today);
    const employee = db.employees.find((e) => e.id === qr.employeeId);

    let result: {
      employeeName: string;
      action: string;
      time: string;
      punctuality?: string;
      status: string;
    } = {
      employeeName: "",
      action: "",
      time: "",
      status: "",
    };

    await updateDb((dbInner) => {
      let entry = dbInner.timeEntries.find(
        (t) => t.employeeId === qr.employeeId && t.date === today
      );

      const plannedStart = planned?.start ?? entry?.plannedStart ?? now;
      const plannedEnd = planned?.end ?? entry?.plannedEnd ?? "23:00";

      if (action === "clock_in" || (!action && (!entry || !entry.actualStart))) {
        const clockInStatus = comparePunctuality(plannedStart, now);
        const newEntry: TimeEntry = {
          id: entry?.id ?? crypto.randomUUID(),
          employeeId: qr.employeeId,
          date: today,
          plannedStart,
          plannedEnd,
          actualStart: now,
          status: "clocked_in",
          method: "qr",
          clockInStatus,
        };
        dbInner.timeEntries = upsertTimeEntry(dbInner.timeEntries, newEntry);
        result = {
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : qr.employeeId,
          action: "Entrée",
          time: now,
          punctuality: clockInStatus,
          status: "clocked_in",
        };
      } else {
        if (!entry) {
          entry = {
            id: crypto.randomUUID(),
            employeeId: qr.employeeId,
            date: today,
            plannedStart,
            plannedEnd,
            actualStart: now,
            status: "clocked_in",
            method: "qr",
          };
          dbInner.timeEntries.unshift(entry);
        }
        const clockOutStatus = comparePunctuality(plannedEnd, now);
        entry.actualEnd = now;
        entry.status = "completed";
        entry.method = "qr";
        entry.clockOutStatus = clockOutStatus;
        result = {
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : qr.employeeId,
          action: "Sortie",
          time: now,
          punctuality: clockOutStatus,
          status: "completed",
        };
      }
    });

    await logAudit(session, "qr_scan", `Pointage ${result.action} — ${result.employeeName}`);

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return apiError(e);
  }
}
