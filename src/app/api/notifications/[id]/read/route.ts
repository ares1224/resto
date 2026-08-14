import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateDb } from "@/lib/db/store";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await updateDb((db) => {
    const n = db.notifications.find((x) => x.id === id);
    if (n) n.read = true;
  });

  return NextResponse.json({ ok: true });
}
