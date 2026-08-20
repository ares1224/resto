import { NextResponse } from "next/server";
import { resendGerantConfirmation } from "@/lib/signup";

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
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
