import { NextResponse } from "next/server";
import { confirmSignupEmail } from "@/lib/signup";
import { toPublicError } from "@/lib/public-error";

export async function POST(request: Request) {
  let token = "";
  try {
    const body = await request.json();
    token = String(body.token ?? "");
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const result = await confirmSignupEmail(token);
  if ("error" in result) {
    return NextResponse.json({ error: toPublicError(result.error) }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await confirmSignupEmail(searchParams.get("token") ?? "");
  if ("error" in result) {
    return NextResponse.json({ error: toPublicError(result.error) }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
