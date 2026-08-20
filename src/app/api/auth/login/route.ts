import { NextResponse } from "next/server";
import { login, LoginBlockedError, homePathForRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  try {
    const session = await login(email, password);
    if (!session) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }
    if (session.role !== "superadmin") {
      try {
        await logAudit(session, "login", `Connexion ${session.role}`);
      } catch {
        // L’audit tenant ne doit pas bloquer la connexion.
      }
    }
    return NextResponse.json({
      ok: true,
      role: session.role,
      mustChangePassword: session.mustChangePassword === true,
      redirectTo: homePathForRole(session.role),
    });
  } catch (e) {
    if (e instanceof LoginBlockedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Stockage persistant indisponible")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
