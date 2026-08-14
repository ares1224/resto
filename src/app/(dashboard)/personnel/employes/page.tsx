import { getDb } from "@/lib/db/store";
import { requireGerant } from "@/lib/page-guard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmployeeCreateForm } from "@/components/personnel/EmployeeCreateForm";
import { EmployeeDeleteButton } from "@/components/personnel/EmployeeDeleteButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  await requireGerant();
  const db = await getDb();

  return (
    <div>
      <Link href="/personnel" className="text-[13px] font-semibold text-[#1B3AE8] hover:underline">
        ← Personnel
      </Link>
      <div className="mb-4 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1D23]">Fiches employés</h1>
          <p className="page-subtitle mt-1">Contrats, salaires et documents RH</p>
        </div>
        <EmployeeCreateForm />
      </div>
      {db.employees.length === 0 ? (
        <EmptyState
          title="Aucun employé enregistré"
          description="Ajoutez votre première fiche employé pour constituer votre équipe et préparer le planning."
          actionLabel="Ajouter un employé"
          actionHref="/personnel/employes"
        />
      ) : (
        <div>
          {db.employees.map((emp) => (
            <Card key={emp.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[14px] font-bold text-[#1B3AE8]"
                    aria-hidden
                  >
                    {emp.firstName.charAt(0).toUpperCase()}
                    {emp.lastName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-[#1A1D23]">
                      {emp.firstName} {emp.lastName}
                    </h3>
                    <p className="text-[12px] text-[#6B7280]">
                      {emp.role} · {emp.contractType} · depuis {emp.startDate}
                    </p>
                    <p className="text-[12px] text-[#6B7280]">
                      {emp.email || "—"} · {emp.phone || "—"}
                    </p>
                    <p className="mt-1 text-[13px] font-medium text-[#374151]">
                      Taux horaire : {emp.hourlyRate > 0 ? `${emp.hourlyRate} €/h` : "—"} · Max{" "}
                      {emp.weeklyMaxHours}h/sem
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={emp.active ? "success" : "default"}>
                    {emp.active ? "Actif" : "Inactif"}
                  </Badge>
                  <EmployeeDeleteButton
                    employeeId={emp.id}
                    employeeName={`${emp.firstName} ${emp.lastName}`}
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 border-t border-[#ECEEF3] pt-4 md:grid-cols-3">
                <div>
                  <h4 className="section-label">Documents</h4>
                  <ul className="mt-1 text-[13px] text-[#374151]">
                    {emp.documents.length === 0 ? (
                      <li className="text-[#9CA3AF]">Aucun</li>
                    ) : (
                      emp.documents.map((d, i) => (
                        <li key={i}>
                          {d.name} ({d.uploadedAt})
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="section-label">Formations</h4>
                  <ul className="mt-1 text-[13px] text-[#374151]">
                    {emp.trainings.length === 0 ? (
                      <li className="text-[#9CA3AF]">Aucune</li>
                    ) : (
                      emp.trainings.map((t, i) => (
                        <li key={i}>
                          {t.title} — {t.date}
                          {t.validUntil && ` (valide jusqu'au ${t.validUntil})`}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="section-label">Notes RH</h4>
                  <p className="mt-1 text-[13px] text-[#374151]">{emp.hrNotes || "—"}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
