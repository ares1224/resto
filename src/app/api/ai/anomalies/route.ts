import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { getDb } from "@/lib/db/store";
import { detectAnomalies } from "@/lib/ai/anomaly-detector";

export async function GET() {
  try {
    await requireApiRole(["gerant"]);
    const db = await getDb();
    const anomalies = detectAnomalies(db);
    return NextResponse.json({ anomalies, count: anomalies.length });
  } catch (e) {
    return apiError(e);
  }
}
