import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db/store";
import { planningSignature } from "@/lib/planning-sync";

/** Empreinte du planning visible par l'utilisateur. Son espace interroge cette
 *  route régulièrement : dès que l'empreinte change, la page se recharge seule. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  return NextResponse.json(
    { signature: planningSignature(db, session) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
