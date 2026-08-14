import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { getDb } from "@/lib/db/store";
import { generateTrafficForecast } from "@/lib/ai/traffic-forecast";

export async function GET(request: Request) {
  try {
    await requireApiRole(["gerant"]);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") ?? undefined;
    const days = Number(searchParams.get("days") ?? "7");
    const db = await getDb();
    const forecast = generateTrafficForecast(db, startDate, days);
    return NextResponse.json(forecast);
  } catch (e) {
    return apiError(e);
  }
}
