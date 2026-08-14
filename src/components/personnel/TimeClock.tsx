"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { TimeEntry } from "@/types";
import { PUNCTUALITY_LABELS } from "@/lib/timeclock";

export function TimeEntriesTable({
  entries,
  employees,
  showPunctuality,
}: {
  entries: TimeEntry[];
  employees: { id: string; firstName: string; lastName: string }[];
  showPunctuality?: boolean;
}) {
  return (
    <Card title="Historique des pointages">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2">Date</th>
              <th className="pb-2">Employé</th>
              <th className="pb-2">Planifié</th>
              <th className="pb-2">Effectif</th>
              {showPunctuality && (
                <>
                  <th className="pb-2">Entrée</th>
                  <th className="pb-2">Sortie</th>
                </>
              )}
              <th className="pb-2">Méthode</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const emp = employees.find((e) => e.id === entry.employeeId);
              return (
                <tr key={entry.id} className="border-b border-stone-50">
                  <td className="py-2">{entry.date}</td>
                  <td className="py-2">{emp ? `${emp.firstName} ${emp.lastName}` : entry.employeeId}</td>
                  <td className="py-2">{entry.plannedStart} - {entry.plannedEnd}</td>
                  <td className="py-2">{entry.actualStart ?? "—"} - {entry.actualEnd ?? "—"}</td>
                  {showPunctuality && (
                    <>
                      <td className="py-2">
                        {entry.clockInStatus ? (
                          <Badge variant={entry.clockInStatus === "late" ? "danger" : "success"}>
                            {PUNCTUALITY_LABELS[entry.clockInStatus]}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="py-2">
                        {entry.clockOutStatus ? (
                          <Badge variant={entry.clockOutStatus === "late" ? "danger" : "success"}>
                            {PUNCTUALITY_LABELS[entry.clockOutStatus]}
                          </Badge>
                        ) : "—"}
                      </td>
                    </>
                  )}
                  <td className="py-2">{entry.method === "qr" ? "QR" : "Manuel"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
