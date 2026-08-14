import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateDb, getDb } from "@/lib/db/store";
import { getTimeEntriesForSession } from "@/lib/data-access";
import {
  comparePunctuality,
  plannedTimesForEmployee,
  upsertTimeEntry,
} from "@/lib/timeclock";
import type { TimeEntry } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  return NextResponse.json(getTimeEntriesForSession(db, session));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Employé requis" }, { status: 403 });
  }

  const { action, entryId } = await request.json();
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

  await updateDb((db) => {
    const planned = plannedTimesForEmployee(db.shiftSlots, session.employeeId!, today);
    let entry = db.timeEntries.find(
      (t) => t.id === entryId || (t.employeeId === session.employeeId && t.date === today)
    );

    const plannedStart = planned?.start ?? entry?.plannedStart ?? now;
    const plannedEnd = planned?.end ?? entry?.plannedEnd ?? "23:00";

    if (action === "clock_in") {
      const clockInStatus = comparePunctuality(plannedStart, now);
      const newEntry: TimeEntry = {
        id: entry?.id ?? crypto.randomUUID(),
        employeeId: session.employeeId!,
        date: today,
        plannedStart,
        plannedEnd,
        actualStart: now,
        status: "clocked_in",
        method: "manual",
        clockInStatus,
      };
      db.timeEntries = upsertTimeEntry(db.timeEntries, newEntry);
    } else if (action === "clock_out" && entry) {
      entry.actualEnd = now;
      entry.status = "completed";
      entry.clockOutStatus = comparePunctuality(plannedEnd, now);
      entry.method = entry.method ?? "manual";
    }
  });

  return NextResponse.json({ ok: true });
}
