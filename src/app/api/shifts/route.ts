import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiPermission, apiError } from "@/lib/api-auth";
import { updateDb, getDb } from "@/lib/db/store";
import { validateShiftLegal } from "@/lib/business";
import { logAudit } from "@/lib/audit";
import { getShiftSlotsForSession, isWeekPublished } from "@/lib/data-access";
import { notifyPlanningChange, notifyWeekReshuffle } from "@/lib/planning-sync";
import { getSessionWithPermissions, ForbiddenError } from "@/lib/api-auth";
import { hasPermission } from "@/lib/permissions";
import type { ShiftSlot } from "@/types";

/** Les espaces qui affichent le planning sont rendus côté serveur : après une
 *  écriture on les invalide pour que le prochain affichage soit à jour. */
function revalidatePlanning(): void {
  revalidatePath("/personnel/planning");
  revalidatePath("/dashboard");
}

export async function GET() {
  try {
    const { session, managerPermissions } = await getSessionWithPermissions();
    const perm =
      session.role === "employe" ? "view_own_planning" : "view_team_planning";
    if (!hasPermission(session, perm, managerPermissions)) {
      throw new ForbiddenError("Forbidden");
    }
    const db = await getDb();
    return NextResponse.json(getShiftSlotsForSession(db, session));
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiPermission("edit_planning");
    const body = await request.json();

    if (body.action === "duplicate_week") {
      const { fromWeek, toWeek } = body;
      await updateDb((db) => {
        const source = db.shiftSlots.filter((s) => s.weekStart === fromWeek);
        const replaced = db.shiftSlots.filter((s) => s.weekStart === toWeek);
        db.shiftSlots = db.shiftSlots.filter((s) => s.weekStart !== toWeek);
        for (const slot of source) {
          db.shiftSlots.push({
            ...slot,
            id: crypto.randomUUID(),
            weekStart: toWeek,
          });
        }
        if (isWeekPublished(db, toWeek)) {
          notifyWeekReshuffle(db, toWeek, [
            ...replaced.map((s) => s.employeeId),
            ...source.map((s) => s.employeeId),
          ]);
        }
      });
      revalidatePlanning();
      await logAudit(session, "planning_duplicate", `Semaine ${fromWeek} → ${toWeek}`);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "publish_week") {
      const { weekStart } = body;
      let notified = 0;
      let publishedAt = "";
      await updateDb((db) => {
        const slots = db.shiftSlots.filter((s) => s.weekStart === weekStart);
        publishedAt = new Date().toISOString();

        const existing = db.planningPublications.find((p) => p.weekStart === weekStart);
        if (existing) {
          existing.publishedAt = publishedAt;
          existing.publishedByUserId = session.userId;
        } else {
          db.planningPublications.unshift({
            weekStart,
            publishedAt,
            publishedByUserId: session.userId,
          });
        }

        const employeeIds = [...new Set(slots.map((s) => s.employeeId))];
        for (const employeeId of employeeIds) {
          const slotCount = slots.filter((s) => s.employeeId === employeeId).length;
          if (
            notifyPlanningChange(db, { kind: "published", employeeId, weekStart, slotCount })
          ) {
            notified++;
          }
        }
      });
      revalidatePlanning();
      await logAudit(session, "planning_publish", `Publication semaine ${weekStart}`);
      return NextResponse.json({ ok: true, publishedAt, notified });
    }

    const slot: ShiftSlot = {
      id: crypto.randomUUID(),
      employeeId: body.employeeId,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      breakMinutes: body.breakMinutes ?? 0,
      isPeak: body.isPeak ?? false,
      weekStart: body.weekStart,
    };

    await updateDb((db) => {
      db.shiftSlots.push(slot);
      if (isWeekPublished(db, slot.weekStart)) {
        notifyPlanningChange(db, { kind: "created", employeeId: slot.employeeId, slot });
      }
    });

    revalidatePlanning();
    await logAudit(session, "planning_create", `Créneau ${slot.id} employé ${slot.employeeId}`);
    return NextResponse.json({ ok: true, slot });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiPermission("edit_planning");
    const body = await request.json();

    await updateDb((db) => {
      const slot = db.shiftSlots.find((s) => s.id === body.id);
      if (!slot) return;
      const before: ShiftSlot = { ...slot };
      Object.assign(slot, {
        employeeId: body.employeeId ?? slot.employeeId,
        dayOfWeek: body.dayOfWeek ?? slot.dayOfWeek,
        startTime: body.startTime ?? slot.startTime,
        endTime: body.endTime ?? slot.endTime,
        breakMinutes: body.breakMinutes ?? slot.breakMinutes,
        isPeak: body.isPeak ?? slot.isPeak,
      });
      if (!isWeekPublished(db, slot.weekStart)) return;

      if (before.employeeId !== slot.employeeId) {
        // Le créneau change de titulaire : les deux espaces sont concernés.
        notifyPlanningChange(db, {
          kind: "unassigned",
          employeeId: before.employeeId,
          slot: before,
        });
        notifyPlanningChange(db, {
          kind: "assigned",
          employeeId: slot.employeeId,
          slot: { ...slot },
        });
        return;
      }

      const changed =
        before.dayOfWeek !== slot.dayOfWeek ||
        before.startTime !== slot.startTime ||
        before.endTime !== slot.endTime ||
        before.breakMinutes !== slot.breakMinutes ||
        before.isPeak !== slot.isPeak;
      if (changed) {
        notifyPlanningChange(db, {
          kind: "updated",
          employeeId: slot.employeeId,
          slot: { ...slot },
        });
      }
    });

    revalidatePlanning();
    await logAudit(session, "planning_update", `Modification créneau ${body.id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireApiPermission("edit_planning");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await updateDb((db) => {
      const removed = db.shiftSlots.find((s) => s.id === id);
      db.shiftSlots = db.shiftSlots.filter((s) => s.id !== id);
      if (removed && isWeekPublished(db, removed.weekStart)) {
        notifyPlanningChange(db, {
          kind: "deleted",
          employeeId: removed.employeeId,
          slot: removed,
        });
      }
    });

    revalidatePlanning();
    await logAudit(session, "planning_delete", `Suppression créneau ${id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireApiPermission("edit_planning");
    const { slots } = await request.json();

    await updateDb((db) => {
      const weekStart = slots[0]?.weekStart;
      if (!weekStart) return;
      const previous = db.shiftSlots.filter((s) => s.weekStart === weekStart);
      db.shiftSlots = db.shiftSlots.filter((s) => s.weekStart !== weekStart);
      db.shiftSlots.push(...slots);
      if (isWeekPublished(db, weekStart)) {
        notifyWeekReshuffle(db, weekStart, [
          ...previous.map((s) => s.employeeId),
          ...slots.map((s: ShiftSlot) => s.employeeId),
        ]);
      }
    });

    revalidatePlanning();
    await logAudit(session, "planning_update", `Modification planning semaine ${slots[0]?.weekStart}`);

    const db = await getDb();
    const errors: string[] = [];
    const employeeIds = [...new Set(slots.map((s: { employeeId: string }) => s.employeeId))] as string[];
    for (const empId of employeeIds) {
      errors.push(...validateShiftLegal(db, empId, slots[0].weekStart));
    }

    return NextResponse.json({ ok: true, legalWarnings: errors });
  } catch (e) {
    return apiError(e);
  }
}
