import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findUserByEmail, updatePlatformDb } from "@/lib/db/store";
import { hashPassword } from "@/lib/password";
import { GENERIC_USER_ERROR } from "@/lib/public-error";

export const runtime = "nodejs";

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const setupKey = (process.env.SETUP_SECRET_KEY ?? "").trim();
  const secretKey = String(body.secretKey ?? "");
  if (!setupKey || !secretsMatch(secretKey, setupKey)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Email et mot de passe (6 car. min) requis" },
      { status: 400 }
    );
  }

  try {
    await updatePlatformDb((platform) => {
      if (!Array.isArray(platform.superAdmins)) platform.superAdmins = [];
      const existingAdmin = platform.superAdmins.find((u) => u.email === email);
      const existingUser = findUserByEmail(platform, email);
      if (existingAdmin || existingUser?.user.role === "superadmin") {
        throw new Error("ALREADY_EXISTS");
      }

      platform.superAdmins.push({
        id: crypto.randomUUID(),
        email,
        password: hashPassword(password),
        name: "Super-admin",
        role: "superadmin",
        emailConfirmed: true,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_EXISTS") {
      return NextResponse.json(
        { error: "Un super admin existe déjà avec cet email" },
        { status: 409 }
      );
    }
    console.error("create-super-admin:", error);
    return NextResponse.json({ error: GENERIC_USER_ERROR }, { status: 500 });
  }

  return NextResponse.json({ message: "Super admin créé avec succès" });
}
