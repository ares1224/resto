import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlanningEditor, EmployeePlanningView } from "@/components/personnel/PlanningEditor";
import { UnavailabilityForm } from "@/components/personnel/UnavailabilityForm";
import { ReplacementManager } from "@/components/personnel/ReplacementManager";
import { PlanningLiveSync } from "@/components/personnel/PlanningLiveSync";
import {
  getShiftSlotsForSession,
  getEmployeesForPlanning,
  getAvailabilitiesForSession,
  getShiftUnavailabilitiesForSession,
  getReplacementOffersForSession,
  getPlanningPublication,
} from "@/lib/data-access";
import { planningSignature } from "@/lib/planning-sync";
import { redirect } from "next/navigation";
import { computeWeeklyHours } from "@/lib/business";
import { Badge } from "@/components/ui/Badge";

function weekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function previousWeek(ws: string): string {
  const d = new Date(ws);
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

export default async function PlanningPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const db = await getDb();
  const perms = db.settings.managerPermissions;
  const canView =
    hasPermission(session, "view_team_planning", perms) ||
    hasPermission(session, "view_own_planning", perms);
  if (!canView) redirect("/dashboard");

  const ws = weekStart();
  const slots = getShiftSlotsForSession(db, session).filter((s) => s.weekStart === ws);
  const employees = getEmployeesForPlanning(db, session);
  const canEdit = session.role !== "employe" && hasPermission(session, "edit_planning", perms);
  const isEmployee = session.role === "employe";
  const unavailabilities = getShiftUnavailabilitiesForSession(db, session);
  const publication = getPlanningPublication(db, ws);

  return (
    <div className="space-y-6">
      {/* Vue en lecture seule : elle se rafraîchit d'elle-même quand le planning
          change. L'éditeur, lui, garde la main sur son état local. */}
      {!canEdit && <PlanningLiveSync signature={planningSignature(db, session)} />}
      <div>
        {!isEmployee && (
          <Link href="/personnel" className="text-[13px] font-semibold text-[#1B3AE8] hover:underline">
            ← Personnel
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold text-[#1A1D23]">
          {isEmployee ? "Mon planning" : "Planning hebdomadaire"}
        </h1>
        <p className="page-subtitle mt-1">
          Semaine du {ws}
          {isEmployee && publication && ` · validé le ${formatDateTime(publication.publishedAt)}`}
        </p>
      </div>

      {canEdit && employees.length === 0 ? (
        <EmptyState
          title="Aucun employé — planning impossible"
          description="Enregistrez d'abord vos employés, puis revenez construire le planning de la semaine."
          actionLabel="Ajouter un employé"
          actionHref="/personnel/employes"
        />
      ) : canEdit ? (
        <>
          <PlanningEditor
            initialSlots={slots}
            employees={employees}
            availabilities={getAvailabilitiesForSession(db, session)}
            weekStart={ws}
            previousWeekStart={previousWeek(ws)}
            publishedAt={publication?.publishedAt}
          />
          <ReplacementManager
            shifts={db.shiftSlots.filter((s) => s.weekStart === ws)}
            employees={employees.map((e) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName }))}
            offers={getReplacementOffersForSession(db, session)}
          />
          {unavailabilities.filter((u) => u.status === "pending").length > 0 && (
            <Card title="Indisponibilités signalées">
              <ul className="space-y-2">
                {unavailabilities.filter((u) => u.status === "pending").map((u) => {
                  const emp = db.employees.find((e) => e.id === u.employeeId);
                  return (
                    <li key={u.id} className="rounded-lg bg-red-50 p-3 text-sm">
                      <strong>{emp?.firstName} {emp?.lastName}</strong> — J{u.dayOfWeek} {u.startTime}-{u.endTime}
                      <p className="mt-1">{u.reason}</p>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </>
      ) : slots.length === 0 ? (
        <>
          <EmptyState
            title={
              publication
                ? "Aucun shift planifié cette semaine"
                : "Planning en préparation"
            }
            description={
              publication
                ? "Vous n'avez aucun créneau sur cette semaine. Toute modification apparaîtra ici automatiquement."
                : "Votre responsable finalise le planning de la semaine. Vos créneaux apparaîtront ici dès qu'il l'aura validé, et vous serez prévenu."
            }
            actionLabel="Voir mes disponibilités"
            actionHref="/personnel/disponibilites"
          />
          <UnavailabilityForm myShifts={[]} />
        </>
      ) : (
        <>
          <EmployeePlanningView slots={slots} weekStart={ws} />
          <UnavailabilityForm myShifts={slots} />
        </>
      )}

      {session.role === "gerant" && employees.length > 0 && (
        <Card title="Heures planifiées (RH)">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Employé</th>
                  <th className="pb-2">Heures</th>
                  <th className="pb-2">Max</th>
                  <th className="pb-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {db.employees.filter((e) => e.active && e.hourlyRate > 0).map((emp) => {
                  const hours = computeWeeklyHours(db, emp.id, ws);
                  const over = hours > emp.weeklyMaxHours;
                  return (
                    <tr key={emp.id} className="border-b">
                      <td className="py-2">{emp.firstName} {emp.lastName}</td>
                      <td className="py-2">{hours.toFixed(1)}h</td>
                      <td className="py-2">{emp.weeklyMaxHours}h</td>
                      <td className="py-2"><Badge variant={over ? "danger" : "success"}>{over ? "Dépassement" : "OK"}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
