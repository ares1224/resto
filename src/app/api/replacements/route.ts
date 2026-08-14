import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateDb } from "@/lib/db/store";
import { requireApiPermission, apiError, requireApiRole } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { isWeekPublished } from "@/lib/data-access";
import { notifyPlanningChange } from "@/lib/planning-sync";
import type { Notification } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await updateDb(() => {});
  if (session.role === "employe" && session.employeeId) {
    return NextResponse.json(
      db.replacementOffers.filter((o) => o.targetEmployeeId === session.employeeId)
    );
  }
  if (session.role === "gerant" || session.role === "manager") {
    return NextResponse.json(db.replacementOffers);
  }
  return NextResponse.json([]);
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    if (body.action === "propose") {
      await requireApiPermission("edit_planning");
      const { shiftSlotId, targetEmployeeId } = body;

      await updateDb((db) => {
        const slot = db.shiftSlots.find((s) => s.id === shiftSlotId);
        if (!slot) return;
        const emp = db.employees.find((e) => e.id === targetEmployeeId);
        const offer = {
          id: crypto.randomUUID(),
          shiftSlotId,
          targetEmployeeId,
          sentByUserId: session.userId,
          status: "pending" as const,
          notifiedAt: new Date().toISOString(),
          weekStart: slot.weekStart,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          roleLabel: emp?.role ?? "Équipe",
        };
        db.replacementOffers.unshift(offer);
        const notification: Notification = {
          id: crypto.randomUUID(),
          type: "replacement",
          title: "Proposition de remplacement",
          message: `${slot.startTime}-${slot.endTime} · semaine du ${slot.weekStart} · ${offer.roleLabel}`,
          severity: "info",
          read: false,
          createdAt: new Date().toISOString(),
          targetRoles: ["employe"],
          // Seul l'employé sollicité doit être averti, pas toute l'équipe.
          targetUserId: db.users.find((u) => u.employeeId === targetEmployeeId)?.id,
          actionHref: "/personnel/remplacements",
          actionLabel: "Répondre →",
        };
        db.notifications.unshift(notification);
      });

      await logAudit(
        session,
        "replacement_propose",
        `Proposition à ${targetEmployeeId} pour shift ${shiftSlotId}`
      );
      return NextResponse.json({ ok: true });
    }

    if (body.action === "respond") {
      if (session.role !== "employe" || !session.employeeId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { offerId, status } = body;

      await updateDb((db) => {
        const offer = db.replacementOffers.find(
          (o) => o.id === offerId && o.targetEmployeeId === session.employeeId
        );
        if (!offer) return;
        offer.status = status;
        offer.respondedAt = new Date().toISOString();

        if (status === "accepted") {
          const slot = db.shiftSlots.find((s) => s.id === offer.shiftSlotId);
          if (slot) {
            const previousEmployeeId = slot.employeeId;
            slot.employeeId = session.employeeId!;
            if (isWeekPublished(db, slot.weekStart) && previousEmployeeId !== slot.employeeId) {
              notifyPlanningChange(db, {
                kind: "unassigned",
                employeeId: previousEmployeeId,
                slot: { ...slot, employeeId: previousEmployeeId },
              });
              notifyPlanningChange(db, {
                kind: "assigned",
                employeeId: slot.employeeId,
                slot: { ...slot },
              });
            }
          }
        }

        db.notifications.unshift({
          id: crypto.randomUUID(),
          type: "replacement",
          title: `Remplacement ${status === "accepted" ? "accepté" : "refusé"}`,
          message: `${session.name} — ${offer.startTime}-${offer.endTime} semaine ${offer.weekStart}`,
          severity: "info",
          read: false,
          createdAt: new Date().toISOString(),
          targetRoles: ["gerant", "manager"],
        });
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return apiError(e);
  }
}
