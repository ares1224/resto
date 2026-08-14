import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { updateDb } from "@/lib/db/store";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["gerant"]);
    const body = await request.json();
    const today = new Date().toISOString().split("T")[0];

    const id = crypto.randomUUID();
    await updateDb((db) => {
      db.cashFlow.unshift({
        id,
        type: body.type,
        category: body.category,
        amount: body.amount,
        date: today,
        description: body.description ?? "",
        isFixed: body.isFixed ?? false,
      });
    });

    await logAudit(session, "cashflow_create", `${body.type} ${body.amount}€ — ${body.category}`);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return apiError(e);
  }
}
