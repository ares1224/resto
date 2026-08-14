import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { getDb } from "@/lib/db/store";
import { getPersonalDataExport } from "@/lib/data-access";

export async function GET() {
  try {
    const session = await requireApiRole(["employe"]);
    const db = await getDb();
    const data = getPersonalDataExport(db, session);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="mes-donnees.json"',
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
