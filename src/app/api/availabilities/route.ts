import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateDb, getDb } from "@/lib/db/store";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { getAvailabilitiesForSession } from "@/lib/data-access";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  return NextResponse.json(getAvailabilitiesForSession(db, session));
}

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["employe"]);
    if (!session.employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();

    await updateDb((db) => {
      db.availabilities.push({
        id: crypto.randomUUID(),
        employeeId: session.employeeId!,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        available: body.available ?? true,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiRole(["employe"]);
    if (!session.employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();

    await updateDb((db) => {
      const item = db.availabilities.find(
        (a) => a.id === body.id && a.employeeId === session.employeeId
      );
      if (!item) return;
      if (body.dayOfWeek !== undefined) item.dayOfWeek = body.dayOfWeek;
      if (body.startTime !== undefined) item.startTime = body.startTime;
      if (body.endTime !== undefined) item.endTime = body.endTime;
      if (body.available !== undefined) item.available = body.available;
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireApiRole(["employe"]);
    if (!session.employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    await updateDb((db) => {
      db.availabilities = db.availabilities.filter(
        (a) => !(a.id === id && a.employeeId === session.employeeId)
      );
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
