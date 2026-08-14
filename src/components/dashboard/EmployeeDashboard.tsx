import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { Calendar, Clock, RefreshCw, ChevronRight, LogIn } from "lucide-react";
import type { Database } from "@/types";
import type { Session } from "@/lib/auth";
import {
  getShiftSlotsForSession,
  getTimeEntriesForSession,
  getReplacementOffersForSession,
} from "@/lib/data-access";
import { BigActionButton } from "@/components/ui/BigActionButton";
import { PlanningLiveSync } from "@/components/personnel/PlanningLiveSync";
import { planningSignature } from "@/lib/planning-sync";

function weekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function todayDayOfWeek(): number {
  const js = new Date().getDay();
  return js === 0 ? 7 : js;
}

export function EmployeeDashboard({ db, session }: { db: Database; session: Session }) {
  const ws = weekStart();
  const today = new Date().toISOString().split("T")[0];
  const todayDow = todayDayOfWeek();
  const emp = db.employees.find((e) => e.id === session.employeeId);
  const shifts = getShiftSlotsForSession(db, session)
    .filter((s) => s.weekStart === ws)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const todayShift = shifts.find((s) => s.dayOfWeek === todayDow);
  const todayEntry = getTimeEntriesForSession(db, session).find((t) => t.date === today);
  const pendingReplacements = getReplacementOffersForSession(db, session).filter(
    (o) => o.status === "pending"
  );

  return (
    <div data-onboarding="dashboard-welcome">
      <PlanningLiveSync signature={planningSignature(db, session)} />
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#1A1D23]">
          Bonjour {emp?.firstName ?? session.name}
        </h1>
        <p className="page-subtitle mt-1">Voici l&apos;essentiel pour votre journée</p>
      </div>

      {/* Pointage de service */}
      <div className="card-surface p-4" data-onboarding="employee-clock">
        <p className="section-label">Pointage de service</p>
        <p className="mt-1 text-[14px] text-[#6B7280]">
          {todayShift
            ? `Service du jour · ${todayShift.startTime} — ${todayShift.endTime}`
            : "Pas de shift prévu aujourd'hui"}
        </p>
        <Link
          href="/personnel/pointage"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B3AE8] px-5 py-3.5 text-[15px] font-semibold text-white hover:bg-[#152FBA]"
        >
          <LogIn className="h-5 w-5" />
          {todayEntry?.actualStart ? "Voir mon pointage" : "Pointer l'arrivée"}
        </Link>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#F5F6FA] p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#6B7280]">
              Arrivée
            </p>
            <p className="mt-1 text-[18px] font-bold text-[#1B3AE8]">
              {todayEntry?.actualStart ?? "—"}
            </p>
          </div>
          <div className="rounded-xl bg-[#F5F6FA] p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#6B7280]">
              Pause
            </p>
            <p className="mt-1 text-[18px] font-bold text-[#1B3AE8]">
              {todayShift?.breakMinutes ? `${todayShift.breakMinutes} min` : "—"}
            </p>
          </div>
        </div>
        {todayShift?.isPeak && (
          <div className="mt-3">
            <Badge variant="warning">Service chargé</Badge>
          </div>
        )}
      </div>

      {pendingReplacements.length > 0 && (
        <Link
          href="/personnel/remplacements"
          className="card-surface mt-3 flex items-center gap-3 p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D1FAE5]">
            <RefreshCw className="h-5 w-5 text-[#047857]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[#1A1D23]">
              {pendingReplacements.length} remplacement
              {pendingReplacements.length > 1 ? "s" : ""} proposé
              {pendingReplacements.length > 1 ? "s" : ""}
            </p>
            <p className="text-[12px] text-[#6B7280]">Répondez en un clic</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
        </Link>
      )}

      {/* Planning de la semaine */}
      <div className="card-surface mt-3 p-4" data-onboarding="employee-planning">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#1A1D23]">Planning de la semaine</h3>
          <Link
            href="/personnel/planning"
            className="text-[12px] font-semibold text-[#1B3AE8] hover:underline"
          >
            Tout voir
          </Link>
        </div>
        {shifts.length === 0 ? (
          <p className="text-[14px] text-[#6B7280]">
            Aucun horaire pour l&apos;instant — il s&apos;affichera dès que votre responsable
            aura validé le planning.
          </p>
        ) : (
          <ul className="divide-y divide-[#ECEEF3]">
            {shifts.map((s) => {
              const isToday = s.dayOfWeek === todayDow;
              return (
                <li
                  key={s.id}
                  className={`flex items-center justify-between gap-3 py-3 ${
                    isToday ? "-mx-2 rounded-xl bg-[#EEF2FF] px-2" : ""
                  }`}
                >
                  <span
                    className={`text-[14px] font-semibold ${
                      isToday ? "text-[#1B3AE8]" : "text-[#1A1D23]"
                    }`}
                  >
                    {isToday ? "Aujourd'hui" : DAYS_SHORT[s.dayOfWeek - 1]}
                    <span className="ml-2 text-[12px] font-normal text-[#6B7280]">
                      {DAYS[s.dayOfWeek - 1]}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[14px] font-medium ${
                      isToday ? "text-[#1B3AE8]" : "text-[#6B7280]"
                    }`}
                  >
                    {s.startTime} — {s.endTime}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2" data-onboarding="employee-availability">
        <BigActionButton
          href="/personnel/disponibilites"
          label="Mes disponibilités"
          description="Indiquer quand je suis libre"
          icon={Calendar}
          variant="secondary"
        />
        <BigActionButton
          href="/personnel/remplacements"
          label="Remplacements"
          description="Propositions reçues"
          icon={RefreshCw}
          variant="secondary"
        />
      </div>

      <details className="card-surface mt-3">
        <summary className="cursor-pointer px-4 py-4 text-[14px] font-semibold text-[#1A1D23]">
          Plus d&apos;options
        </summary>
        <div className="space-y-2 px-4 pb-4">
          <Link
            href="/mon-espace/mot-de-passe"
            className="block text-[14px] text-[#1B3AE8] hover:underline"
          >
            Changer mon mot de passe
          </Link>
          <Link
            href="/mon-espace/donnees"
            className="block text-[14px] text-[#1B3AE8] hover:underline"
          >
            Mes informations personnelles
          </Link>
          {emp && emp.trainings.length > 0 && (
            <div className="pt-2">
              <p className="section-label">Formations</p>
              <ul className="mt-1 space-y-1 text-[14px] text-[#374151]">
                {emp.trainings.map((t, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[#9CA3AF]" />
                    {t.title} — {t.date}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
