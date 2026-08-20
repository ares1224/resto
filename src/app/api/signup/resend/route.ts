import { NextResponse } from "next/server";
import { resendGerantConfirmation } from "@/lib/signup";
import { toPublicError } from "@/lib/public-error";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = String(body.email ?? "");
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const result = await resendGerantConfirmation(email);
  if ("error" in result) {
    const message =
      result.status === 502
        ? "L'envoi de l'email a échoué, veuillez réessayer"
        : result.error;
    return NextResponse.json({ error: toPublicError(message) }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
