import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, updateDb } from "@/lib/db/store";
import { runAlertEngine } from "@/lib/business";
import { getNotificationsForSession } from "@/lib/data-access";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  await updateDb((db) => {
    runAlertEngine(db);
    db.notifications = db.notifications.slice(0, 50);
  });

  const db = await getDb();
  const notifications = getNotificationsForSession(db, session);
  return NextResponse.json(notifications);
}
