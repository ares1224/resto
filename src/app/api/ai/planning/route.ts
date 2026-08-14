import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { getDb, updateDb } from "@/lib/db/store";
import { generatePlanningProposal } from "@/lib/ai/planning-generator";
import { validateShiftLegal } from "@/lib/business";
import { logAudit } from "@/lib/audit";
import { isWeekPublished } from "@/lib/data-access";
import { notifyWeekReshuffle } from "@/lib/planning-sync";

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["gerant"]);
    const { weekStart } = await request.json();
    if (!weekStart) {
      return NextResponse.json({ error: "weekStart requis" }, { status: 400 });
    }
    const db = await getDb();
    const proposal = generatePlanningProposal(db, weekStart);
    await logAudit(session, "ai_planning_generate", `Proposition semaine ${weekStart} — ${proposal.slots.length} créneaux`);
    return NextResponse.json(proposal);
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireApiRole(["gerant"]);
    const { weekStart, slots, mode } = await request.json();
    if (!weekStart || !Array.isArray(slots)) {
      return NextResponse.json({ error: "weekStart et slots requis" }, { status: 400 });
    }

    const newSlots = slots.map((s: {
      employeeId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      breakMinutes?: number;
      isPeak?: boolean;
    }) => ({
      id: crypto.randomUUID(),
      employeeId: s.employeeId,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      breakMinutes: s.breakMinutes ?? 0,
      isPeak: s.isPeak ?? false,
      weekStart,
    }));

    await updateDb((db) => {
      const previous = db.shiftSlots.filter((s) => s.weekStart === weekStart);
      if (mode === "merge") {
        db.shiftSlots.push(...newSlots);
      } else {
        db.shiftSlots = db.shiftSlots.filter((s) => s.weekStart !== weekStart);
        db.shiftSlots.push(...newSlots);
      }
      if (isWeekPublished(db, weekStart)) {
        notifyWeekReshuffle(db, weekStart, [
          ...previous.map((s) => s.employeeId),
          ...newSlots.map((s) => s.employeeId),
        ]);
      }
    });

    revalidatePath("/personnel/planning");
    revalidatePath("/dashboard");

    const db = await getDb();
    const warnings: string[] = [];
    const employeeIds = [...new Set(newSlots.map((s) => s.employeeId))];
    for (const empId of employeeIds) {
      warnings.push(...validateShiftLegal(db, empId, weekStart));
    }

    await logAudit(
      session,
      "ai_planning_apply",
      `Application proposition ${mode === "merge" ? "fusion" : "remplacement"} semaine ${weekStart}`
    );

    return NextResponse.json({ ok: true, legalWarnings: warnings, applied: newSlots.length });
  } catch (e) {
    return apiError(e);
  }
}
