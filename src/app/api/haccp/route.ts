import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateDb } from "@/lib/db/store";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { checkId, value } = await request.json();

  await updateDb((db) => {
    const check = db.haccpChecks.find((c) => c.id === checkId);
    if (check) {
      check.completed = true;
      check.completedAt = new Date().toISOString();
      check.completedBy = session.employeeId ?? session.userId;
      if (value) check.value = value;
    }
  });

  return NextResponse.json({ ok: true });
}
