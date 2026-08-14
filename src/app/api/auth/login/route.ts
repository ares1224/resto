import { NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/db/store";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const session = await login(email, password);
  if (!session) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }
  await logAudit(session, "login", `Connexion ${session.role}`);
  const db = await getDb();
  const user = db.users.find((u) => u.id === session.userId);
  return NextResponse.json({
    ok: true,
    role: session.role,
    mustChangePassword: user?.mustChangePassword === true,
  });
}
