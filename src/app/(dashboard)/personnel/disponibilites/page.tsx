import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { getSession } from "@/lib/auth";
import { canManageEmployees } from "@/lib/permissions";
import { AvailabilityForm, AvailabilityListAll } from "@/components/personnel/AvailabilityForm";

export default async function DisponibilitesPage() {
  const session = await getSession();
  const db = await getDb();
  const isEmployee = session?.role === "employe";
  const myAvail = session?.employeeId
    ? db.availabilities.filter((a) => a.employeeId === session.employeeId)
    : [];

  return (
    <div className="space-y-6">
      <Link href={isEmployee ? "/dashboard" : "/personnel"} className="text-sm text-amber-700 hover:underline">
        ← {isEmployee ? "Mon espace" : "Personnel"}
      </Link>
      <h1 className="text-2xl font-bold">Disponibilités</h1>
      <p className="text-stone-500">
        {isEmployee ? "Déclarez vos créneaux disponibles pour le planning" : "Vue consolidée des disponibilités équipe"}
      </p>
      {isEmployee && session?.employeeId && <AvailabilityForm initial={myAvail} />}
      {session && canManageEmployees(session.role) && (
        <AvailabilityListAll items={db.availabilities} employees={db.employees} />
      )}
    </div>
  );
}
