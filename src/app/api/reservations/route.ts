import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateDb } from "@/lib/db/store";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role === "employe") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (body.action === "reminder") {
    await updateDb((db) => {
      const res = db.reservations.find((r) => r.id === body.reservationId);
      if (res) {
        res.reminderSent = true;
        db.notifications.unshift({
          id: crypto.randomUUID(),
          type: "reservation",
          title: "Rappel envoyé",
          message: `SMS/email envoyé à ${res.guestName} pour ${res.date} à ${res.time}`,
          severity: "info",
          read: false,
          createdAt: new Date().toISOString(),
          targetRoles: ["gerant", "manager"],
        });
      }
    });
  }

  return NextResponse.json({ ok: true });
}
