import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateDb } from "@/lib/db/store";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shift, incidents, handoverNotes } = await request.json();

  await updateDb((db) => {
    db.shiftLogs.unshift({
      id: crypto.randomUUID(),
      shift,
      date: new Date().toISOString().split("T")[0],
      authorId: session.employeeId ?? session.userId,
      incidents: incidents ?? "",
      handoverNotes: handoverNotes ?? "",
      createdAt: new Date().toISOString(),
    });
  });

  return NextResponse.json({ ok: true });
}
