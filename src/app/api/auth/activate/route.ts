import { NextResponse } from "next/server";
import { getDb, updateDb } from "@/lib/db/store";
import { isTokenValid } from "@/lib/password";
import { login } from "@/lib/auth";
import { apiError } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token requis" }, { status: 400 });
  }

  const db = await getDb();
  const user = db.users.find((u) => u.passwordSetupToken === token);
  if (!user || !isTokenValid(user.passwordSetupTokenExpires)) {
    return NextResponse.json({ valid: false, error: "Lien expiré ou invalide" });
  }

  return NextResponse.json({
    valid: true,
    email: user.email,
    name: user.name,
  });
}

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password || String(password).length < 6) {
      return NextResponse.json({ error: "Token et mot de passe (6 car. min) requis" }, { status: 400 });
    }

    let email = "";
    await updateDb((db) => {
      const user = db.users.find((u) => u.passwordSetupToken === token);
      if (!user || !isTokenValid(user.passwordSetupTokenExpires)) {
        throw new Error("INVALID_TOKEN");
      }
      email = user.email;
      user.password = password;
      user.mustChangePassword = false;
      user.passwordSetupToken = undefined;
      user.passwordSetupTokenExpires = undefined;
    });

    const session = await login(email, password);
    if (!session) {
      return NextResponse.json({ error: "Activation réussie mais connexion échouée" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, role: session.role });
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_TOKEN") {
      return NextResponse.json({ error: "Lien expiré ou invalide" }, { status: 400 });
    }
    return apiError(e);
  }
}
