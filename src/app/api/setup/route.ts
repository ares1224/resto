import { NextResponse } from "next/server";
import { getDb, updateDb, resetCache } from "@/lib/db/store";
import { isSetupComplete } from "@/lib/db/seed";
import { login } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const db = await getDb();
  return NextResponse.json({ needsSetup: !isSetupComplete(db) });
}

export async function POST(request: Request) {
  const db = await getDb();
  if (isSetupComplete(db)) {
    return NextResponse.json({ error: "Configuration déjà effectuée" }, { status: 403 });
  }

  const body = await request.json();
  const { restaurantName, email, password, name } = body;

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Nom, email et mot de passe requis" }, { status: 400 });
  }

  const userId = crypto.randomUUID();
  const employeeId = crypto.randomUUID();

  await updateDb((dbInner) => {
    dbInner.settings.restaurantName = restaurantName?.trim() || "Mon restaurant";
    dbInner.settings.covers = 0;
    dbInner.users.push({
      id: userId,
      email: email.trim().toLowerCase(),
      password,
      name: name.trim(),
      role: "gerant",
    });
    dbInner.employees.push({
      id: employeeId,
      firstName: name.trim().split(" ")[0] ?? name.trim(),
      lastName: name.trim().split(" ").slice(1).join(" ") || "—",
      role: "Gérant",
      contractType: "CDI",
      hourlyRate: 0,
      weeklyMaxHours: 45,
      phone: "",
      email: email.trim().toLowerCase(),
      startDate: new Date().toISOString().split("T")[0],
      documents: [],
      trainings: [],
      hrNotes: "",
      active: true,
    });
  });

  resetCache();
  const session = await login(email.trim().toLowerCase(), password);
  if (session) {
    await logAudit(session, "setup_complete", "Première configuration établissement");
  }

  return NextResponse.json({ ok: true });
}
