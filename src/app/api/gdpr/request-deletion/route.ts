import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  try {
    const session = await requireApiRole(["employe"]);
    await logAudit(session, "gdpr_deletion_request", "Demande suppression données personnelles RGPD");
    return NextResponse.json({ ok: true, message: "Demande enregistrée" });
  } catch (e) {
    return apiError(e);
  }
}
