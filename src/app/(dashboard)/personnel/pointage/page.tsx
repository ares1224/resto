import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getTimeEntriesForSession,
  getEmployeesForPlanning,
} from "@/lib/data-access";
import { EmployeeQrCode } from "@/components/personnel/EmployeeQrCode";
import { QrScanner } from "@/components/personnel/QrScanner";
import { TimeEntriesTable } from "@/components/personnel/TimeClock";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PUNCTUALITY_LABELS } from "@/lib/timeclock";

export default async function PointagePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const db = await getDb();
  const entries = getTimeEntriesForSession(db, session).slice(0, 30);

  if (session.role === "employe") {
    return (
      <div>
        <Link href="/dashboard" className="text-[13px] font-semibold text-[#1B3AE8] hover:underline">
          ← Accueil
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#1A1D23]">Pointer</h1>
        <p className="page-subtitle mb-4 mt-1">
          Montrez ce QR code à l&apos;accueil en arrivant et en partant.
        </p>
        <EmployeeQrCode />
        <Card
          title="Mes derniers pointages"
          help="Historique de vos arrivées et départs enregistrés."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Planifié</th>
                  <th className="pb-2">Effectif</th>
                  <th className="pb-2">Entrée</th>
                  <th className="pb-2">Sortie</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="py-2">{e.date}</td>
                    <td className="py-2">{e.plannedStart}-{e.plannedEnd}</td>
                    <td className="py-2">{e.actualStart ?? "—"} - {e.actualEnd ?? "—"}</td>
                    <td className="py-2">{e.clockInStatus ? PUNCTUALITY_LABELS[e.clockInStatus] : "—"}</td>
                    <td className="py-2">{e.clockOutStatus ? PUNCTUALITY_LABELS[e.clockOutStatus] : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  const employees = getEmployeesForPlanning(db, session);

  return (
    <div>
      <Link href="/personnel" className="text-[13px] font-semibold text-[#1B3AE8] hover:underline">
        ← Personnel
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold text-[#1A1D23]">Pointage QR code</h1>
      <QrScanner />
      <TimeEntriesTable
        entries={entries}
        employees={employees.map((e) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName }))}
        showPunctuality
      />
    </div>
  );
}
