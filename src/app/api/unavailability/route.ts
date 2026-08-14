import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateDb, getDb } from "@/lib/db/store";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { getShiftUnavailabilitiesForSession } from "@/lib/data-access";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  return NextResponse.json(getShiftUnavailabilitiesForSession(db, session));
}

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["employe"]);
    if (!session.employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { shiftSlotId, reason } = await request.json();
    const db = await getDb();
    const slot = db.shiftSlots.find(
      (s) => s.id === shiftSlotId && s.employeeId === session.employeeId
    );
    if (!slot) {
      return NextResponse.json({ error: "Créneau introuvable" }, { status: 404 });
    }

    await updateDb((db) => {
      db.shiftUnavailabilities.unshift({
        id: crypto.randomUUID(),
        employeeId: session.employeeId!,
        shiftSlotId: slot.id,
        weekStart: slot.weekStart,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        reason: reason || "Non précisé",
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      db.notifications.unshift({
        id: crypto.randomUUID(),
        type: "staffing",
        title: "Indisponibilité signalée",
        message: `${session.name} — J${slot.dayOfWeek} ${slot.startTime}-${slot.endTime} : ${reason}`,
        severity: "warning",
        read: false,
        createdAt: new Date().toISOString(),
        targetRoles: ["gerant", "manager"],
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiRole(["gerant", "manager"]);
    const { id, status } = await request.json();

    await updateDb((db) => {
      const item = db.shiftUnavailabilities.find((u) => u.id === id);
      if (item) item.status = status ?? "acknowledged";
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
