import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { getDb } from "@/lib/db/store";

export async function GET() {
  try {
    await requireApiRole(["gerant"]);
    const db = await getDb();
    return NextResponse.json(db.auditLog);
  } catch (e) {
    return apiError(e);
  }
}
