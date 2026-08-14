import { createHash } from "crypto";
import type { Database, Notification, ShiftSlot } from "@/types";
import type { Session } from "@/lib/auth";
import { getShiftSlotsForSession } from "@/lib/data-access";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const PLANNING_HREF = "/personnel/planning";

/** "2026-08-10" → "10/08/2026" */
function formatWeek(weekStart: string): string {
  const [y, m, d] = weekStart.split("-");
  return d && m && y ? `${d}/${m}/${y}` : weekStart;
}

function dayLabel(dayOfWeek: number): string {
  return DAYS[dayOfWeek - 1] ?? `Jour ${dayOfWeek}`;
}

function slotLabel(slot: ShiftSlot): string {
  return `${dayLabel(slot.dayOfWeek)} ${slot.startTime} → ${slot.endTime}`;
}

export type PlanningChange =
  | { kind: "published"; employeeId: string; weekStart: string; slotCount: number }
  | { kind: "week_updated"; employeeId: string; weekStart: string; slotCount: number }
  | {
      kind: "created" | "updated" | "deleted" | "assigned" | "unassigned";
      employeeId: string;
      slot: ShiftSlot;
    };

function buildNotification(
  change: PlanningChange
): Pick<Notification, "title" | "message" | "severity"> {
  switch (change.kind) {
    case "published":
      return {
        title: "Planning publié",
        message: `Votre planning de la semaine du ${formatWeek(change.weekStart)} est disponible — ${change.slotCount} créneau(x).`,
        severity: "info",
      };
    case "week_updated":
      return {
        title: "Planning mis à jour",
        message:
          change.slotCount > 0
            ? `Votre planning de la semaine du ${formatWeek(change.weekStart)} a changé — ${change.slotCount} créneau(x).`
            : `Vous n'avez plus de créneau sur la semaine du ${formatWeek(change.weekStart)}.`,
        severity: "info",
      };
    case "created":
      return {
        title: "Nouveau créneau",
        message: `${slotLabel(change.slot)} a été ajouté à votre planning (semaine du ${formatWeek(change.slot.weekStart)}).`,
        severity: "info",
      };
    case "assigned":
      return {
        title: "Créneau attribué",
        message: `${slotLabel(change.slot)} vous a été attribué (semaine du ${formatWeek(change.slot.weekStart)}).`,
        severity: "info",
      };
    case "updated":
      return {
        title: "Créneau modifié",
        message: `Votre créneau est désormais ${slotLabel(change.slot)} (semaine du ${formatWeek(change.slot.weekStart)}).`,
        severity: "warning",
      };
    case "deleted":
      return {
        title: "Créneau annulé",
        message: `${slotLabel(change.slot)} a été retiré de votre planning (semaine du ${formatWeek(change.slot.weekStart)}).`,
        severity: "warning",
      };
    case "unassigned":
      return {
        title: "Créneau retiré",
        message: `${slotLabel(change.slot)} ne vous est plus attribué (semaine du ${formatWeek(change.slot.weekStart)}).`,
        severity: "warning",
      };
  }
}

function weekStartOf(change: PlanningChange): string {
  return "weekStart" in change ? change.weekStart : change.slot.weekStart;
}

/**
 * Prévient l'employé concerné qu'un changement touche son planning. La
 * notification est adressée à son seul compte (`targetUserId`) : les collègues
 * ne la voient pas. Retourne false si l'employé n'a pas encore de compte.
 */
export function notifyPlanningChange(db: Database, change: PlanningChange): boolean {
  const user = db.users.find((u) => u.employeeId === change.employeeId);
  if (!user) return false;

  const { title, message, severity } = buildNotification(change);

  // Une validation ou une refonte de semaine remplace l'avis non lu précédent
  // sur la même semaine, pour éviter d'empiler des messages redondants.
  if (change.kind === "published" || change.kind === "week_updated") {
    const weekLabel = formatWeek(weekStartOf(change));
    db.notifications = db.notifications.filter(
      (n) =>
        !(
          n.type === "planning" &&
          n.targetUserId === user.id &&
          !n.read &&
          n.message.includes(weekLabel) &&
          (n.title === "Planning publié" || n.title === "Planning mis à jour")
        )
    );
  }

  db.notifications.unshift({
    id: crypto.randomUUID(),
    type: "planning",
    title,
    message,
    severity,
    read: false,
    createdAt: new Date().toISOString(),
    targetRoles: ["employe"],
    targetUserId: user.id,
    actionHref: PLANNING_HREF,
    actionLabel: "Voir mon planning →",
  });
  return true;
}

/** Notifie tous les employés touchés par un remaniement de semaine. */
export function notifyWeekReshuffle(
  db: Database,
  weekStart: string,
  employeeIds: Iterable<string>
): void {
  for (const employeeId of new Set(employeeIds)) {
    const slotCount = db.shiftSlots.filter(
      (s) => s.weekStart === weekStart && s.employeeId === employeeId
    ).length;
    notifyPlanningChange(db, { kind: "week_updated", employeeId, weekStart, slotCount });
  }
}

/**
 * Empreinte du planning visible par la session. Elle change dès qu'un créneau
 * visible est créé, modifié, supprimé, ou qu'une semaine est validée : l'espace
 * de l'employé peut ainsi se rafraîchir tout seul.
 */
export function planningSignature(db: Database, session: Session): string {
  const slots = getShiftSlotsForSession(db, session)
    .map(
      (s) =>
        `${s.id}:${s.employeeId}:${s.dayOfWeek}:${s.startTime}:${s.endTime}:${s.breakMinutes}:${s.isPeak ? 1 : 0}:${s.weekStart}`
    )
    .sort();
  const publications = (db.planningPublications ?? [])
    .map((p) => `${p.weekStart}@${p.publishedAt}`)
    .sort();
  return createHash("sha1")
    .update([...slots, ...publications].join("|"))
    .digest("hex")
    .slice(0, 16);
}
