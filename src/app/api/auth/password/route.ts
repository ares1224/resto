import { NextResponse } from "next/server";
import { getSession, refreshSessionCookie } from "@/lib/auth";
import { updateDb } from "@/lib/db/store";
import { apiError } from "@/lib/api-auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      return NextResponse.json(
        { error: "Mot de passe actuel et nouveau (6 car. min) requis" },
        { status: 400 }
      );
    }

    await updateDb((db) => {
      const user = db.users.find((u) => u.id === session.userId);
      if (!user || user.password !== currentPassword) {
        throw new Error("BAD_PASSWORD");
      }
      user.password = newPassword;
      user.mustChangePassword = false;
      user.passwordSetupToken = undefined;
      user.passwordSetupTokenExpires = undefined;
    });

    await refreshSessionCookie();

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "BAD_PASSWORD") {
      return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 403 });
    }
    return apiError(e);
  }
}
